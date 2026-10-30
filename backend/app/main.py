import asyncio
from typing import Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.supabase_client import insert_look_record, match_skus_for_regions
from app.cv.color_math import RegionColorFeatures, extract_all_regions_color_math
from app.cv.mediapipe_cv import extract_masked_facial_regions
from app.cv.vision_api import AestheticSubculture, classify_look_with_vision_model

app = FastAPI(
    title="AurasMatch AI Microservice",
    description="Computer Vision & Cosmetic Discovery Backend for AurasMatch",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LookUploadRequest(BaseModel):
    """Incoming payload from the client after uploading the raw look image to Cloudflare R2."""

    user_id: str = Field(..., description="UUID of the user uploading the look")
    image_url: str = Field(..., description="R2 URL/path of the uploaded look image (stored in looks.image_path)")


class CielabCoordinates(BaseModel):
    """Perceptual CIELAB (L*, a*, b*) coordinates for an extracted region."""

    l: float
    a: float
    b: float


class RegionExtractionResult(BaseModel):
    """Color extraction and Delta E SKU matches for a single anatomical facial region."""

    dominant_hex: str
    cielab: CielabCoordinates
    closest_sku_id: Optional[int] = None
    category_matches: Dict[str, Optional[int]]


class ExtractedRegionsPayload(BaseModel):
    """Structured JSONB schema stored in looks.extracted_regions across all 4 masked zones."""

    lips: RegionExtractionResult
    brows: RegionExtractionResult
    eyelids: RegionExtractionResult
    lash_line: RegionExtractionResult


class LookAnalysisResponse(BaseModel):
    """Response returned to the client after FastAPI inserts the analyzed record into Supabase."""

    look_id: str = Field(..., description="Newly created UUID primary key (looks.id) from Supabase")
    subculture: AestheticSubculture
    is_human_verified: bool
    ai_confidence_score: float = Field(..., ge=0.0, le=1.0)
    extracted_regions: ExtractedRegionsPayload


async def _download_image_bytes(image_url: str) -> bytes:
    """Downloads image bytes into memory from the provided R2 URL."""
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(image_url)
        response.raise_for_status()
        return response.content


def _segment_and_extract_colors_in_memory(image_bytes: bytes) -> Dict[str, RegionColorFeatures]:
    """Runs MediaPipe polygon masking and K-Means in-memory, immediately discarding pixel buffers."""
    masked_regions = extract_masked_facial_regions(image_bytes)
    try:
        return extract_all_regions_color_math(masked_regions)
    finally:
        masked_regions.clear()


@app.post(
    "/analyze-look",
    response_model=LookAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_look(request: LookUploadRequest) -> LookAnalysisResponse:
    """Executes the in-memory CV pipeline, matches SKUs across 6 categories, and inserts into Supabase."""
    # Step 1: Download the original image bytes into memory via HTTPX
    try:
        image_bytes = await _download_image_bytes(request.image_url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image from URL: {exc}",
        ) from exc

    # Step 2 & Step 3: In-memory polygon masking (Lips, Brows, Eyelids, Lash Line) + K-Means RGB -> CIELAB
    try:
        regions_color = await asyncio.to_thread(
            _segment_and_extract_colors_in_memory,
            image_bytes,
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

    # Step 4 & Step 5: Concurrent Delta E SKU matching (6 categories) & Visual Decision Model classification
    try:
        extracted_regions_dict, vision_result = await asyncio.gather(
            match_skus_for_regions(regions_color),
            classify_look_with_vision_model(request.image_url),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Visual decision model request failed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SKU matching or subculture classification failed: {exc}",
        ) from exc

    # Step 6: Backend-authoritative Supabase INSERT into the `looks` table using Service Role Key
    try:
        look_id = await insert_look_record(
            user_id=request.user_id,
            image_path=request.image_url,
            subculture=vision_result["subculture"],
            is_human_verified=vision_result["is_human_verified"],
            ai_confidence_score=vision_result["ai_confidence_score"],
            extracted_regions=extracted_regions_dict,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist look analysis to Supabase: {exc}",
        ) from exc

    # Step 7: Return the newly created looks.id (UUID) and structured analysis payload
    return LookAnalysisResponse(
        look_id=look_id,
        subculture=vision_result["subculture"],
        is_human_verified=vision_result["is_human_verified"],
        ai_confidence_score=vision_result["ai_confidence_score"],
        extracted_regions=ExtractedRegionsPayload(**extracted_regions_dict),
    )
