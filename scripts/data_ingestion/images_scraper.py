import os
import io
import re
import math
import time
import base64
import cv2
import numpy as np
import httpx
import boto3
import pandas as pd
from uuid import uuid4
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv
from supabase import create_client, Client
from ddgs import DDGS
from sklearn.cluster import KMeans
from skimage.color import rgb2lab
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

load_dotenv()

# ==========================================
# Configuration & Clients
# ==========================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
JEV_API_KEY = os.getenv("JEV_API_KEY")
R2_BUCKET = "auras-match"
JEV_API_URL = os.getenv("JEV_API_URL", "https://api.typesafe.ai/v1/systemone")

if (
    SUPABASE_KEY is None
    or SUPABASE_URL is None
    or R2_ACCOUNT_ID is None
    or R2_ACCESS_KEY is None
    or R2_SECRET_KEY is None
    or JEV_API_KEY is None
):
    raise ValueError("One or more required environment variables are not set.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
)

FACE_LANDMARKER_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "models", "face_landmarker.task"
)
base_options = python.BaseOptions(model_asset_path=FACE_LANDMARKER_MODEL_PATH)
face_landmarker_options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    num_faces=1,
)
face_landmarker = vision.FaceLandmarker.create_from_options(face_landmarker_options)

# ==========================================
# MediaPipe Indices & Category Mappings
# ==========================================
REGION_TO_CATEGORIES: Dict[str, List[str]] = {
    "lips": ["lipstick", "lip_liner"],
    "brows": ["eyebrow"],
    "eyelids": ["eyeshadow"],
    "lash_line": ["eyeliner", "mascara"],
}

ALL_TARGET_CATEGORIES: List[str] = [
    "lipstick", "lip_liner", "eyeliner", "eyeshadow", "mascara", "eyebrow",
]
SUBCULTURE_TARGETS = ['Jirai Kei', 'Clean Girl', 'Goth', 'E-Girl', 'Y2K']

LIP_OUTER_POLYGON: List[int] = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
LIP_INNER_POLYGON: List[int] = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]
LEFT_BROW_POLYGON: List[int] = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
RIGHT_BROW_POLYGON: List[int] = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
LEFT_EYELID_CREASE_POLYGON: List[int] = [226, 247, 30, 29, 27, 28, 56, 190, 243, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYELID_CREASE_POLYGON: List[int] = [463, 414, 286, 258, 257, 259, 260, 467, 446, 466, 388, 387, 386, 385, 384, 398]
LEFT_EYE_SCLERA_POLYGON: List[int] = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
RIGHT_EYE_SCLERA_POLYGON: List[int] = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]
LEFT_LASH_LINE_POLYGON: List[int] = [33, 246, 161, 160, 159, 158, 157, 173, 133, 243, 112, 26, 22, 23, 24, 110, 25, 130]
RIGHT_LASH_LINE_POLYGON: List[int] = [263, 466, 388, 387, 386, 385, 384, 398, 362, 463, 341, 256, 252, 253, 254, 339, 255, 359]

# Anatomical Skin Patch Polygons for Anti-AI Forensics (Cheeks & Forehead)
LEFT_CHEEK_POLYGON: List[int] = [116, 117, 118, 101, 36, 205, 187, 123]
RIGHT_CHEEK_POLYGON: List[int] = [345, 346, 347, 330, 266, 425, 411, 352]
FOREHEAD_SKIN_POLYGON: List[int] = [109, 10, 338, 297, 333, 299, 151, 69, 104, 67]

REGION_DEFINITIONS = {
    "lips": {"pos": [LIP_OUTER_POLYGON], "neg": [LIP_INNER_POLYGON]},
    "brows": {"pos": [LEFT_BROW_POLYGON, RIGHT_BROW_POLYGON], "neg": []},
    "eyelids": {"pos": [LEFT_EYELID_CREASE_POLYGON, RIGHT_EYELID_CREASE_POLYGON], "neg": []},
    "lash_line": {"pos": [LEFT_LASH_LINE_POLYGON, RIGHT_LASH_LINE_POLYGON], "neg": [LEFT_EYE_SCLERA_POLYGON, RIGHT_EYE_SCLERA_POLYGON]}
}

AI_GENERATOR_SIGNATURES: Tuple[bytes, ...] = (
    b"trainedAlgorithmicMedia",
    b"compositeWithTrainedAlgorithmicMedia",
    b"c2pa.ai_generated",
    b"c2pa.trained_algorithmic_media",
    b"Midjourney",
    b"Stable Diffusion",
    b"Automatic1111",
    b"ComfyUI",
    b"DALL-E",
    b"DALL\xc2\xb7E",
    b"Adobe Firefly",
    b"Bing Image Creator",
    b"Black Forest Labs",
    b"Flux.1",
    b"NovelAI",
    b"InvokeAI",
    b"Fooocus",
    b"DreamStudio",
    b"Negative prompt:",
    b"CFG scale:",
)

CAMERA_PROVENANCE_SIGNATURES: Tuple[bytes, ...] = (
    b"digitalCapture",
    b"http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture",
)

CAMERA_MAKES: Tuple[bytes, ...] = (
    b"Apple", b"Samsung", b"SONY", b"Canon", b"NIKON", b"Google",
    b"FUJIFILM", b"Panasonic", b"Xiaomi", b"motorola", b"OnePlus",
    b"HUAWEI", b"Leica", b"OLYMPUS",
)

# ==========================================
# Helper Functions
# ==========================================
def get_or_create_bot_user_id() -> str:
    """Ensures a valid system/bot user exists in Supabase Auth and public.profiles."""
    env_bot_id = os.getenv("SYSTEM_USER_ID")
    if env_bot_id:
        return env_bot_id

    bot_email = "bot@aurasmatch.local"
    bot_username = "aurasmatch_bot"

    users = supabase.auth.admin.list_users()
    bot_user = next((u for u in users if getattr(u, "email", None) == bot_email), None)

    if bot_user is None:
        created = supabase.auth.admin.create_user({
            "email": bot_email,
            "password": str(uuid4()),
            "email_confirm": True,
            "user_metadata": {"username": bot_username},
        })
        bot_user = created.user

    bot_id = str(bot_user.id)

    # Ensure row exists in public.profiles (username is NOT NULL UNIQUE)
    existing_profile = supabase.table("profiles").select("id").eq("id", bot_id).execute()
    if not existing_profile.data:
        supabase.table("profiles").insert({
            "id": bot_id,
            "username": bot_username,
        }).execute()

    return bot_id

def load_product_catalog() -> pd.DataFrame:
    res = supabase.table("products").select("id, category, cielab_l, cielab_a, cielab_b").execute()
    return pd.DataFrame(res.data)

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

def build_exclusion_mask(img_shape, landmarks, pos_polygons, neg_polygons):
    """Draws white positive polygons, then overwrites exclusions with black."""
    h, w = img_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    
    for poly in pos_polygons:
        pts = np.array([(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in poly], np.int32)
        cv2.fillPoly(mask, [pts], 255)
        
    for poly in neg_polygons:
        pts = np.array([(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in poly], np.int32)
        cv2.fillPoly(mask, [pts], 0)
        
    return mask

def get_dominant_color_and_lab(img, mask):
    masked_img = cv2.bitwise_and(img, img, mask=mask)
    pixels = masked_img.reshape(-1, 3)
    non_black_pixels = pixels[np.any(pixels != [0, 0, 0], axis=1)]
    
    if len(non_black_pixels) == 0:
        return None, None
        
    kmeans = KMeans(n_clusters=1, n_init=10).fit(non_black_pixels)
    dominant_rgb = kmeans.cluster_centers_[0]
    
    rgb_normalized = np.array([[dominant_rgb / 255.0]])
    lab = rgb2lab(rgb_normalized)[0][0]
    return rgb_to_hex(dominant_rgb), lab

def find_closest_sku(lab_coords, category_filter, catalog_df):
    if lab_coords is None:
        return None
        
    subset = catalog_df[catalog_df['category'].isin(category_filter)].copy()
    if subset.empty:
        return None
        
    subset['delta_e'] = np.sqrt(
        (subset['cielab_l'] - lab_coords[0])**2 +
        (subset['cielab_a'] - lab_coords[1])**2 +
        (subset['cielab_b'] - lab_coords[2])**2
    )
    return int(subset.loc[subset['delta_e'].idxmin()]['id'])

# ==========================================
# 3-Stage Hybrid Anti-AI Detection Engine
# ==========================================
def inspect_c2pa_and_metadata(raw_bytes: bytes) -> dict:
    """Stage 1: Inspects raw image bytes for C2PA JUMBF manifests, XMP/IPTC, and EXIF."""
    if not raw_bytes:
        return {"status": "no_provenance", "metadata_ai_score": None}

    header_slice = raw_bytes[:262144]
    trailer_slice = raw_bytes[-65536:] if len(raw_bytes) > 262144 else b""
    search_buf = header_slice + b"\x00" + trailer_slice

    for sig in AI_GENERATOR_SIGNATURES:
        if sig in search_buf:
            return {"status": "ai_provenance_detected", "metadata_ai_score": 0.98}

    if re.search(rb"(?:steps:\s*\d+.*sampler:|v1-5-pruned|sd_xl_base|ai[\s_-]*generated)", search_buf, re.IGNORECASE):
        return {"status": "ai_provenance_detected", "metadata_ai_score": 0.96}

    for cam_sig in CAMERA_PROVENANCE_SIGNATURES:
        if cam_sig in search_buf:
            return {"status": "camera_provenance_detected", "metadata_ai_score": 0.05}

    if b"Exif\x00\x00" in header_slice:
        for make in CAMERA_MAKES:
            if make in header_slice:
                return {"status": "camera_provenance_detected", "metadata_ai_score": 0.12}

    return {"status": "no_provenance", "metadata_ai_score": None}

def compute_spectral_forensics(img_rgb: np.ndarray) -> float:
    """Stage 2A: 2D FFT Azimuthal Power Spectrum analysis for synthetic frequency roll-off & grid spikes."""
    h, w = img_rgb.shape[:2]
    if h < 64 or w < 64:
        return 0.35

    lum = (
        0.299 * img_rgb[:, :, 0].astype(np.float32)
        + 0.587 * img_rgb[:, :, 1].astype(np.float32)
        + 0.114 * img_rgb[:, :, 2].astype(np.float32)
    ) / 255.0

    side = min(h, w, 512)
    y0, x0 = (h - side) // 2, (w - side) // 2
    patch = lum[y0 : y0 + side, x0 : x0 + side]
    patch = patch - float(np.mean(patch))

    win_1d = np.hanning(side).astype(np.float32)
    fft_2d = np.fft.fftshift(np.fft.fft2(patch * np.outer(win_1d, win_1d)))
    power_spectrum = np.abs(fft_2d) ** 2 + 1e-12

    cy, cx = side // 2, side // 2
    yy, xx = np.ogrid[:side, :side]
    r_grid = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2).astype(np.int32)
    max_r = side // 2
    if max_r < 16:
        return 0.35

    radial_sum = np.bincount(r_grid.ravel(), weights=np.log10(power_spectrum).ravel())
    radial_cnt = np.bincount(r_grid.ravel())
    valid_r = np.arange(4, max_r)
    radial_profile = radial_sum[valid_r] / np.maximum(radial_cnt[valid_r], 1)

    log_r = np.log10(valid_r.astype(np.float64))
    slope, intercept = np.polyfit(log_r, radial_profile, 1)
    residuals = radial_profile - (slope * log_r + intercept)

    if -3.25 <= slope <= -1.95:
        slope_penalty = 0.0
    elif slope < -3.25:
        slope_penalty = min(1.0, (-3.25 - slope) / 1.1)
    else:
        slope_penalty = min(1.0, (slope - (-1.95)) / 0.8)

    hf_mask = valid_r >= (max_r // 2)
    if np.any(hf_mask):
        hf_residuals = np.abs(residuals[hf_mask])
        spike_metric = float(np.percentile(hf_residuals, 95) - np.median(hf_residuals))
        spike_penalty = min(1.0, max(0.0, (spike_metric - 0.14) / 0.25))
    else:
        spike_penalty = 0.0

    rmse = float(np.sqrt(np.mean(residuals**2)))
    rmse_penalty = min(1.0, max(0.0, (rmse - 0.12) / 0.25))

    spectral_score = (0.45 * slope_penalty) + (0.35 * spike_penalty) + (0.20 * rmse_penalty)
    return round(float(max(0.0, min(1.0, spectral_score))), 4)

def compute_facial_microtexture_forensics(img_rgb: np.ndarray, landmarks) -> float:
    """Stage 2B: Luminance-invariant cheek/forehead micro-texture vs ocular sharpness & RGB residual correlation."""
    skin_mask = build_exclusion_mask(
        img_rgb.shape,
        landmarks,
        pos_polygons=[LEFT_CHEEK_POLYGON, RIGHT_CHEEK_POLYGON, FOREHEAD_SKIN_POLYGON],
        neg_polygons=[],
    )
    eye_mask = build_exclusion_mask(
        img_rgb.shape,
        landmarks,
        pos_polygons=[LEFT_EYE_SCLERA_POLYGON, RIGHT_EYE_SCLERA_POLYGON],
        neg_polygons=[],
    )

    skin_ys, skin_xs = np.where(skin_mask > 0)
    if len(skin_xs) < 60:
        return 0.35

    img_float = img_rgb.astype(np.float32) / 255.0
    lum = 0.299 * img_float[:, :, 0] + 0.587 * img_float[:, :, 1] + 0.114 * img_float[:, :, 2]

    local_lum = cv2.GaussianBlur(lum, (15, 15), 3.0)
    norm_factor = np.maximum(local_lum, 0.18)

    smooth_fine = cv2.GaussianBlur(lum, (3, 3), 0.9)
    hp_residual = (lum - smooth_fine) / norm_factor
    skin_hp = hp_residual[skin_mask > 0]

    laplacian_abs = np.abs(cv2.Laplacian(lum, cv2.CV_32F, ksize=3)) / norm_factor
    skin_sharpness = float(np.median(laplacian_abs[skin_mask > 0])) + 1e-6
    eye_pixels = laplacian_abs[eye_mask > 0]
    eye_sharpness = float(np.percentile(eye_pixels, 75)) + 1e-6 if len(eye_pixels) > 20 else skin_sharpness * 4.0

    eye_to_skin_ratio = eye_sharpness / skin_sharpness
    plasticity_penalty = min(1.0, max(0.0, (eye_to_skin_ratio - 7.5) / 10.0))

    hist, _ = np.histogram(np.clip(skin_hp, -0.15, 0.15), bins=32, range=(-0.15, 0.15), density=True)
    hist_probs = hist / (np.sum(hist) + 1e-12)
    nonzero_probs = hist_probs[hist_probs > 0]
    entropy = float(-np.sum(nonzero_probs * np.log2(nonzero_probs)))
    entropy_penalty = min(1.0, max(0.0, (3.05 - entropy) / 1.15))

    r_hp = (img_float[:, :, 0] - cv2.GaussianBlur(img_float[:, :, 0], (3, 3), 0.9))[skin_mask > 0]
    g_hp = (img_float[:, :, 1] - cv2.GaussianBlur(img_float[:, :, 1], (3, 3), 0.9))[skin_mask > 0]
    b_hp = (img_float[:, :, 2] - cv2.GaussianBlur(img_float[:, :, 2], (3, 3), 0.9))[skin_mask > 0]

    def _safe_corr(x: np.ndarray, y: np.ndarray) -> float:
        sx, sy = float(np.std(x)), float(np.std(y))
        if sx < 1e-6 or sy < 1e-6:
            return 0.95
        c = float(np.corrcoef(x, y)[0, 1])
        return c if not math.isnan(c) else 0.85

    mean_corr = 0.5 * (abs(_safe_corr(r_hp, g_hp)) + abs(_safe_corr(g_hp, b_hp)))
    corr_penalty = min(1.0, max(0.0, (mean_corr - 0.86) / 0.13))

    skin_ai_score = (0.45 * plasticity_penalty) + (0.35 * entropy_penalty) + (0.20 * corr_penalty)
    return round(float(max(0.0, min(1.0, skin_ai_score))), 4)

def evaluate_anti_ai_confidence(
    raw_bytes: bytes,
    img_rgb: np.ndarray,
    landmarks,
    vision_ai_score: Optional[float] = None,
    ai_threshold: float = 0.50,
) -> dict:
    """Combines Stage 1 (C2PA/Metadata), Stage 2 (Spectral + Facial Micro-Texture), and Stage 3 (Vision Model)."""
    meta_res = inspect_c2pa_and_metadata(raw_bytes)
    spectral_score = compute_spectral_forensics(img_rgb)
    facial_texture_score = compute_facial_microtexture_forensics(img_rgb, landmarks)

    if meta_res["status"] == "ai_provenance_detected" and meta_res["metadata_ai_score"] is not None:
        final_ai_score = float(meta_res["metadata_ai_score"])
        return {
            "ai_confidence_score": round(final_ai_score, 4),
            "is_human_verified": final_ai_score < ai_threshold,
        }

    cv_forensics_score = (0.45 * spectral_score) + (0.55 * facial_texture_score)
    if vision_ai_score is not None:
        fused_score = (0.55 * float(vision_ai_score)) + (0.45 * cv_forensics_score)
    else:
        fused_score = cv_forensics_score

    if meta_res["status"] == "camera_provenance_detected" and meta_res["metadata_ai_score"] is not None:
        fused_score = (0.75 * fused_score) + (0.25 * float(meta_res["metadata_ai_score"]))

    final_ai_score = round(float(max(0.0, min(1.0, fused_score))), 4)
    return {
        "ai_confidence_score": final_ai_score,
        "is_human_verified": final_ai_score < ai_threshold,
    }

def call_jev_model(image_bytes: bytes) -> dict:
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": "jev-latest",
        "state": {
            "photo": "look-photo"
        },
        "assets": {
            "look-photo": {
                "type": "image",
                "format": "jpeg",
                "data_base64": b64_image,
            }
        },
        "questions": {
            "choice": {
                "type": "choice",
                "instructions": (
                    "Identify the fashion aesthetic that best describes the person's visible aesthetic. "
                    "Use your existing knowledge of fashion, alternative fashion, internet aesthetics and "
                    "fashion subcultures. Interpret each option according to its commonly recognized meaning. "
                    "Do not rely on the name alone if the visual characteristics do not match. "
                    "Choose Other if none is a convincing match."
                ),
                "criteria": {
                    "Jirai Kei": "Jirai Kei",
                    "Clean Girl": "Clean Girl",
                    "E-girl": "E-girl",
                    "Y2K": "Y2K",
                    "Goth": "Goth",
                    "Other": "None of these adequately describes the aesthethic.",
                },
            },
            "ai_detection": {
                "type": "choice",
                "instructions": (
                    "Determine whether this portrait is an authentic photograph of a real human or "
                    "synthetic/AI-generated content (such as Midjourney, Stable Diffusion, Flux, DALL-E, "
                    "CGI, or heavy AI face synthesis). Inspect skin micro-texture, iris/pupil geometry, "
                    "hair strand coherence, lighting physics, and background artifacts. "
                    "Do not misclassify real humans who simply have soft lighting or makeup as AI."
                ),
                "criteria": {
                    "Real_Human": "An authentic photograph of a real human being.",
                    "AI_Generated": "A synthetic, AI-generated, or heavily AI-synthesized image.",
                },
            },
        },
    }

    headers = {
        "Authorization": f"Bearer {JEV_API_KEY}",
        "Content-Type": "application/json",
        "TypeSafe-Danger-Zone-Images": "true",
    }

    resp = httpx.post(JEV_API_URL, json=payload, headers=headers, timeout=30.0)
    if resp.is_error:
        raise RuntimeError(f"Jev API {resp.status_code}: {resp.text}")
    data = resp.json()
    answers = data.get("answers", {})

    choice_ans = answers.get("choice", {})
    selected_choice = choice_ans.get("choice", "Other")
    probabilities = choice_ans.get("probabilities", {})
    subculture_confidence = float(choice_ans.get("confidence", probabilities.get(selected_choice, 0.0)))

    # Map "E-girl" to "E-Girl" if the Postgres aesthetic_subculture enum uses "E-Girl"
    enum_choice = "E-Girl" if selected_choice == "E-girl" else selected_choice

    ai_ans = answers.get("ai_detection", {})
    vision_ai_score: Optional[float] = None
    if ai_ans:
        ai_probs = ai_ans.get("probabilities", {})
        if "AI_Generated" in ai_probs:
            vision_ai_score = float(ai_probs["AI_Generated"])
        elif "Real_Human" in ai_probs:
            vision_ai_score = 1.0 - float(ai_probs["Real_Human"])
        else:
            ai_choice = ai_ans.get("choice")
            ai_conf = float(ai_ans.get("confidence", 0.5))
            if ai_choice == "AI_Generated":
                vision_ai_score = ai_conf
            elif ai_choice == "Real_Human":
                vision_ai_score = 1.0 - ai_conf

    return {
        "choice": enum_choice,
        "subcultures": [enum_choice] if enum_choice and enum_choice != "Other" else [],
        "tags": [],
        "score": round(subculture_confidence, 4),
        "subculture_confidence_score": round(subculture_confidence, 4),
        "vision_ai_score": round(vision_ai_score, 4) if vision_ai_score is not None else None,
        "probabilities": probabilities,
    }

# ==========================================
# Main Pipeline
# ==========================================
def process_and_upload():
    print("Loading product catalog into memory...")
    catalog_df = load_product_catalog()
    system_user_id = get_or_create_bot_user_id()
    print(f"Using system bot user ID: {system_user_id}")

    for subculture in SUBCULTURE_TARGETS:
        print(f"Scraping images for: {subculture} makeup...")
        
        results = []
        for attempt in range(3):
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.images(f"{subculture} makeup look portrait", max_results=10))
                break
            except Exception as search_err:
                wait_sec = 5 * (attempt + 1)
                print(f"⚠️ Search failed for {subculture} (attempt {attempt + 1}/3): {search_err}. Waiting {wait_sec}s...")
                time.sleep(wait_sec)
        
        if not results:
            continue
            
        for res in results:
            image_url = res.get("image")
            try:
                # 1. Download Image
                response = httpx.get(image_url, timeout=10.0, follow_redirects=True)
                response.raise_for_status()
                image_bytes = response.content
                
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    continue
                ok, jpeg_buf = cv2.imencode(".jpg", img)
                if not ok:
                    continue
                jpeg_bytes = jpeg_buf.tobytes()
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                # 2. MediaPipe Face Landmarker
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                detection_result = face_landmarker.detect(mp_image)
                if not detection_result.face_landmarks:
                    continue
                    
                landmarks = detection_result.face_landmarks[0]
                extracted_data = {}
                
                # 3. Dynamic Masking & Extraction based on REGION_TO_CATEGORIES
                for region, target_categories in REGION_TO_CATEGORIES.items():
                    defs = REGION_DEFINITIONS[region]
                    mask = build_exclusion_mask(img.shape, landmarks, defs["pos"], defs["neg"])
                    hex_val, lab_coords = get_dominant_color_and_lab(img_rgb, mask)
                    
                    if hex_val:
                        sku_matches = {}
                        # Find the best specific product for each category that region covers
                        for category in target_categories:
                            best_sku = find_closest_sku(lab_coords, [category], catalog_df)
                            if best_sku:
                                sku_matches[category] = best_sku
                        
                        extracted_data[region] = {
                            "hex_value": hex_val,
                            "recommended_skus": sku_matches
                        }
                
                # 4. Jev Classification + Semantic AI Detection
                jev_results = call_jev_model(jpeg_bytes)
                if not jev_results["subcultures"]:
                    print(f"⏭️ Skipped {image_url} (Jev classified as Other)")
                    continue

                # 5. 3-Stage Hybrid Anti-AI Detection Engine
                anti_ai_res = evaluate_anti_ai_confidence(
                    raw_bytes=image_bytes,
                    img_rgb=img_rgb,
                    landmarks=landmarks,
                    vision_ai_score=jev_results.get("vision_ai_score"),
                )
                if not anti_ai_res["is_human_verified"]:
                    print(f"🤖 Skipped {image_url} (Flagged as AI/Synthetic: ai_confidence_score={anti_ai_res['ai_confidence_score']:.2f})")
                    continue
                
                # 6. R2 Upload (Original only)
                file_id = str(uuid4())
                r2_path = f"scraped_looks/{file_id}.jpg"
                s3.upload_fileobj(io.BytesIO(jpeg_bytes), R2_BUCKET, r2_path, ExtraArgs={'ContentType': 'image/jpeg'})
                
                # 7. Database Write
                db_record = {
                    "user_id": system_user_id,
                    "image_path": r2_path,
                    "is_human_verified": anti_ai_res["is_human_verified"],
                    "ai_confidence_score": anti_ai_res["ai_confidence_score"],
                    "subculture_confidence_score": jev_results["subculture_confidence_score"],
                    "subculture": jev_results["subcultures"],
                    "tags": jev_results["tags"],
                    "extracted_regions": extracted_data
                }
                
                supabase.table("looks").insert(db_record).execute()
                print(
                    f"✅ Processed and saved: {file_id} "
                    f"({jev_results['choice']} subculture_conf={jev_results['subculture_confidence_score']:.2f}, "
                    f"ai_score={anti_ai_res['ai_confidence_score']:.2f})"
                )
                
            except Exception as e:
                print(f"❌ Failed to process {image_url}: {e}")

        time.sleep(3)

if __name__ == "__main__":
    process_and_upload()
