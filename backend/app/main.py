import asyncio
import base64
from typing import Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.supabase_client import (
    download_image_bytes,
    insert_look_record,
    match_skus_for_regions,
    upload_jpeg_to_r2,
    verify_supabase_jwt,
)
from app.cv.anti_ai import (
    compute_facial_microtexture_forensics,
    compute_spectral_forensics,
    evaluate_anti_ai_confidence,
    inspect_c2pa_and_metadata,
)
from app.cv.color_math import RegionColorFeatures, extract_all_regions_color_math
from app.cv.mediapipe_cv import (
    REGION_DEFINITIONS,
    build_exclusion_mask,
    decode_image_to_rgb_and_jpeg,
    detect_face_landmarks,
)
from app.cv.vision_api import classify_look_with_vision_model

_is_production = settings.environment.strip().lower() == "production"

app = FastAPI(
    title="AurasMatch AI Microservice",
    description="Computer Vision, Hybrid Anti-AI Verification, Subculture Classification & Cosmetic Recommendation Backend",
    version="2.3.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Verifies the caller's Supabase Auth JWT (`Authorization: Bearer <access_token>`) and returns their user UUID."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await verify_supabase_jwt(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


class LookUploadRequest(BaseModel):
    """Incoming payload from the client to analyze an uploaded or remote look image."""

    image_url: Optional[str] = Field(
        default=None,
        description="HTTP(S) URL or R2 object path (e.g. 'user_looks/uuid.jpg') of the look image",
    )
    image_base64: Optional[str] = Field(
        default=None,
        description="Optional raw base64-encoded image if not providing image_url",
    )
    upload_to_r2: bool = Field(
        default=False,
        description="Whether to upload the normalized JPEG to Cloudflare R2 if image_url is an external URL or base64",
    )
    r2_folder: str = Field(
        default="user_looks",
        description="Target folder prefix in R2 when upload_to_r2 is True",
    )


class RegionRecommendationResult(BaseModel):
    """Dominant color hex and recommended product SKUs per category for a facial region."""

    hex_value: str
    recommended_skus: Dict[str, int] = Field(default_factory=dict)


class ExtractedRegionsPayload(BaseModel):
    """Structured JSONB schema stored in looks.extracted_regions across the 4 masked zones."""

    lips: Optional[RegionRecommendationResult] = None
    brows: Optional[RegionRecommendationResult] = None
    eyelids: Optional[RegionRecommendationResult] = None
    lash_line: Optional[RegionRecommendationResult] = None


class AntiAIBreakdown(BaseModel):
    """Detailed breakdown of the 3-Stage Hybrid Anti-AI Detection Engine."""

    provenance_status: str
    metadata_ai_score: Optional[float] = None
    spectral_ai_score: float
    facial_texture_ai_score: float
    vision_ai_score: Optional[float] = None


class LookAnalysisResponse(BaseModel):
    """Response returned to the client after FastAPI inserts the analyzed record into Supabase."""

    look_id: str = Field(..., description="Newly created UUID primary key (looks.id) from Supabase")
    image_path: str = Field(..., description="Stored R2 path or URL in looks.image_path")
    choice: str = Field(..., description="Top subculture choice returned by Jev model")
    subculture: List[str] = Field(..., description="Array of matched subcultures stored in looks.subculture")
    tags: List[str] = Field(default_factory=list, description="Tags stored in looks.tags")
    is_human_verified: bool = Field(
        ...,
        description="True when ai_confidence_score < 0.50; False causes the feed to filter out synthetic content",
    )
    ai_confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Calibrated probability (0.0 - 1.0) that the image is AI-generated/synthetic",
    )
    subculture_confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Jev model confidence (0.0 - 1.0) for the classified aesthetic subculture",
    )
    probabilities: Dict[str, float] = Field(default_factory=dict)
    anti_ai_breakdown: Optional[AntiAIBreakdown] = None
    extracted_regions: ExtractedRegionsPayload


def _segment_extract_and_forensics_in_memory(
    raw_image_bytes: bytes,
) -> tuple[bytes, Dict[str, RegionColorFeatures], dict]:
    """Runs MediaPipe FaceLandmarker, polygon color extraction, and Stage 1+2 Anti-AI Forensics in-memory."""
    img_bgr, img_rgb, jpeg_bytes = decode_image_to_rgb_and_jpeg(raw_image_bytes)
    landmarks = detect_face_landmarks(img_rgb)

    masked_regions = {}
    for region, defs in REGION_DEFINITIONS.items():
        mask = build_exclusion_mask(img_bgr.shape, landmarks, defs["pos"], defs["neg"])
        masked_regions[region] = (img_rgb, mask)

    try:
        regions_color = extract_all_regions_color_math(masked_regions)
        meta_res = inspect_c2pa_and_metadata(raw_image_bytes)
        spectral_score = compute_spectral_forensics(img_rgb)
        facial_texture_score = compute_facial_microtexture_forensics(img_rgb, landmarks)
        partial_forensics = {
            "raw_bytes": raw_image_bytes,
            "img_rgb": img_rgb,
            "landmarks": landmarks,
            "meta_res": meta_res,
            "spectral_score": spectral_score,
            "facial_texture_score": facial_texture_score,
        }
        return jpeg_bytes, regions_color, partial_forensics
    finally:
        masked_regions.clear()


async def _run_analysis_pipeline(
    raw_image_bytes: bytes,
    authenticated_user_id: str,
    image_path: Optional[str],
    should_upload_to_r2: bool,
    r2_folder: str,
) -> LookAnalysisResponse:
    # Step 1: In-memory MediaPipe FaceLandmarker polygon masking + K-Means CIELAB + Stage 1/2 Anti-AI Forensics
    try:
        jpeg_bytes, regions_color, partial_forensics = await asyncio.to_thread(
            _segment_extract_and_forensics_in_memory,
            raw_image_bytes,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"In-memory facial polygon segmentation or color extraction failed: {exc}",
        ) from exc

    # Step 2: Concurrent Delta E SKU matching (6 categories) & Jev Visual Decision Model (Subculture + AI Detection)
    try:
        extracted_regions_dict, jev_result = await asyncio.gather(
            match_skus_for_regions(regions_color),
            classify_look_with_vision_model(jpeg_bytes),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Jev visual decision model request failed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SKU matching or subculture classification failed: {exc}",
        ) from exc

    # Step 3: Fuse 3-Stage Hybrid Anti-AI Confidence Score & Human Verification Flag
    anti_ai_res = evaluate_anti_ai_confidence(
        raw_bytes=raw_image_bytes,
        img_rgb=partial_forensics["img_rgb"],
        landmarks=partial_forensics["landmarks"],
        vision_ai_score=jev_result.get("vision_ai_score"),
    )

    # Step 4: R2 upload if requested
    try:
        if should_upload_to_r2 or not image_path:
            final_image_path = await upload_jpeg_to_r2(jpeg_bytes, folder=r2_folder)
        else:
            final_image_path = image_path
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image to R2: {exc}",
        ) from exc

    # Step 5: Supabase INSERT into `looks` using verified authenticated_user_id
    try:
        look_id = await insert_look_record(
            user_id=authenticated_user_id,
            image_path=final_image_path,
            subculture=jev_result["subcultures"],
            is_human_verified=anti_ai_res["is_human_verified"],
            ai_confidence_score=anti_ai_res["ai_confidence_score"],
            subculture_confidence_score=jev_result["subculture_confidence_score"],
            extracted_regions=extracted_regions_dict,
            tags=jev_result["tags"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist look analysis to Supabase: {exc}",
        ) from exc

    return LookAnalysisResponse(
        look_id=look_id,
        image_path=final_image_path,
        choice=jev_result["choice"],
        subculture=jev_result["subcultures"],
        tags=jev_result["tags"],
        is_human_verified=anti_ai_res["is_human_verified"],
        ai_confidence_score=anti_ai_res["ai_confidence_score"],
        subculture_confidence_score=jev_result["subculture_confidence_score"],
        probabilities=jev_result["probabilities"],
        anti_ai_breakdown=AntiAIBreakdown(
            provenance_status=anti_ai_res["provenance_status"],
            metadata_ai_score=anti_ai_res["metadata_ai_score"],
            spectral_ai_score=anti_ai_res["spectral_ai_score"],
            facial_texture_ai_score=anti_ai_res["facial_texture_ai_score"],
            vision_ai_score=anti_ai_res["vision_ai_score"],
        ),
        extracted_regions=ExtractedRegionsPayload(**extracted_regions_dict),
    )


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for cloud hosting platforms."""
    return {"status": "ok", "service": "AurasMatch AI Microservice"}


@app.post(
    "/analyze-look",
    response_model=LookAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_look(
    request: LookUploadRequest,
    authenticated_user_id: str = Depends(get_current_user_id),
) -> LookAnalysisResponse:
    """Executes the CV pipeline, Hybrid Anti-AI filter, SKU matching, and Jev classification for an authenticated user."""
    if not request.image_url and not request.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'image_url' or 'image_base64' must be provided.",
        )

    try:
        if request.image_base64:
            b64_str = request.image_base64.split(",")[-1]
            image_bytes = base64.b64decode(b64_str)
            should_upload = True
        else:
            assert request.image_url is not None
            image_bytes = await download_image_bytes(request.image_url)
            should_upload = request.upload_to_r2
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to load image bytes: {exc}",
        ) from exc

    return await _run_analysis_pipeline(
        raw_image_bytes=image_bytes,
        authenticated_user_id=authenticated_user_id,
        image_path=request.image_url,
        should_upload_to_r2=should_upload,
        r2_folder=request.r2_folder,
    )


@app.post(
    "/analyze-look/upload",
    response_model=LookAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_uploaded_look(
    request: Request,
    r2_folder: str = Query(default="user_looks", description="Target R2 folder prefix"),
    authenticated_user_id: str = Depends(get_current_user_id),
) -> LookAnalysisResponse:
    """Accepts a raw image body or multipart form upload from an authenticated user, uploads to R2, and analyzes."""
    content_type = request.headers.get("content-type", "")
    image_bytes: bytes = b""

    if "multipart/form-data" in content_type:
        form = await request.form()
        file_obj = form.get("file")
        if file_obj is not None and hasattr(file_obj, "read"):
            image_bytes = await file_obj.read()  # type: ignore[misc]
        if form.get("r2_folder"):
            r2_folder = str(form.get("r2_folder"))
    else:
        image_bytes = await request.body()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image payload is empty.",
        )

    return await _run_analysis_pipeline(
        raw_image_bytes=image_bytes,
        authenticated_user_id=authenticated_user_id,
        image_path=None,
        should_upload_to_r2=True,
        r2_folder=r2_folder,
    )
