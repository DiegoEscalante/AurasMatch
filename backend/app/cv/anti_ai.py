import math
import re
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import cv2
import numpy as np

from app.cv.mediapipe_cv import build_exclusion_mask

# ==========================================
# MediaPipe Anatomical Skin Patch Polygons
# (Cheeks & Forehead - avoids eye/lip makeup)
# ==========================================
LEFT_CHEEK_POLYGON: List[int] = [116, 117, 118, 101, 36, 205, 187, 123]
RIGHT_CHEEK_POLYGON: List[int] = [345, 346, 347, 330, 266, 425, 411, 352]
FOREHEAD_SKIN_POLYGON: List[int] = [109, 10, 338, 297, 333, 299, 151, 69, 104, 67]

# Peri-ocular reference polygons for sharpness ratio (distinguishes soft-lit human photos from AI wax skin)
LEFT_EYE_REF_POLYGON: List[int] = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
RIGHT_EYE_REF_POLYGON: List[int] = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]

# Known AI Generator & C2PA Signatures
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
    b"Apple",
    b"Samsung",
    b"SONY",
    b"Canon",
    b"NIKON",
    b"Google",
    b"FUJIFILM",
    b"Panasonic",
    b"Xiaomi",
    b"motorola",
    b"OnePlus",
    b"HUAWEI",
    b"Leica",
    b"OLYMPUS",
)


class MetadataProvenanceResult(TypedDict):
    status: str  # "ai_provenance_detected" | "camera_provenance_detected" | "no_provenance"
    has_c2pa_manifest: bool
    matched_signature: Optional[str]
    metadata_ai_score: Optional[float]


class AntiAIForensicsResult(TypedDict):
    ai_confidence_score: float
    is_human_verified: bool
    provenance_status: str
    metadata_ai_score: Optional[float]
    spectral_ai_score: float
    facial_texture_ai_score: float
    vision_ai_score: Optional[float]


# ==========================================
# Stage 1: Active C2PA & Metadata Provenance
# ==========================================
def inspect_c2pa_and_metadata(raw_bytes: bytes) -> MetadataProvenanceResult:
    """Inspects raw image bytes (before OpenCV re-encoding) for C2PA JUMBF manifests, XMP/IPTC, and EXIF."""
    if not raw_bytes:
        return {
            "status": "no_provenance",
            "has_c2pa_manifest": False,
            "matched_signature": None,
            "metadata_ai_score": None,
        }

    # Metadata & JUMBF boxes typically reside in header/trailer segments; inspect up to first 256KB and last 64KB
    header_slice = raw_bytes[:262144]
    trailer_slice = raw_bytes[-65536:] if len(raw_bytes) > 262144 else b""
    search_buf = header_slice + b"\x00" + trailer_slice

    has_c2pa = any(marker in search_buf for marker in (b"c2pa", b"jumb", b"c2ma", b"c2cl", b"urn:c2pa"))

    # 1. Check explicit AI C2PA / XMP / PNG generator signatures
    for sig in AI_GENERATOR_SIGNATURES:
        if sig in search_buf:
            return {
                "status": "ai_provenance_detected",
                "has_c2pa_manifest": has_c2pa,
                "matched_signature": sig.decode("utf-8", errors="ignore"),
                "metadata_ai_score": 0.98,
            }

    # Check case-insensitive prompt/diffusion metadata in PNG tEXt/iTXt or XMP
    if re.search(rb"(?:steps:\s*\d+.*sampler:|v1-5-pruned|sd_xl_base|ai[\s_-]*generated)", search_buf, re.IGNORECASE):
        return {
            "status": "ai_provenance_detected",
            "has_c2pa_manifest": has_c2pa,
            "matched_signature": "diffusion_generation_parameters",
            "metadata_ai_score": 0.96,
        }

    # 2. Check C2PA / IPTC authentic digital capture provenance
    for cam_sig in CAMERA_PROVENANCE_SIGNATURES:
        if cam_sig in search_buf:
            return {
                "status": "camera_provenance_detected",
                "has_c2pa_manifest": has_c2pa,
                "matched_signature": cam_sig.decode("utf-8", errors="ignore"),
                "metadata_ai_score": 0.05,
            }

    # 3. Check physical camera EXIF header (Exif\x00\x00 + Make + Exposure/ISO tags)
    if b"Exif\x00\x00" in header_slice:
        for make in CAMERA_MAKES:
            if make in header_slice:
                return {
                    "status": "camera_provenance_detected",
                    "has_c2pa_manifest": has_c2pa,
                    "matched_signature": f"EXIF:{make.decode('utf-8', errors='ignore')}",
                    "metadata_ai_score": 0.12,
                }

    return {
        "status": "no_provenance",
        "has_c2pa_manifest": has_c2pa,
        "matched_signature": None,
        "metadata_ai_score": None,
    }


# ==========================================
# Stage 2A: 2D FFT Azimuthal Spectral Forensics
# ==========================================
def compute_spectral_forensics(img_rgb: np.ndarray) -> float:
    """Analyzes the 2D Fourier azimuthal power spectrum to detect synthetic frequency roll-off & grid artifacts.

    Returns a score in [0.0, 1.0] where higher values indicate stronger synthetic spectral anomalies.
    """
    h, w = img_rgb.shape[:2]
    if h < 64 or w < 64:
        return 0.35

    # Convert to perceptual luminance Y in [0, 1]
    lum = (
        0.299 * img_rgb[:, :, 0].astype(np.float32)
        + 0.587 * img_rgb[:, :, 1].astype(np.float32)
        + 0.114 * img_rgb[:, :, 2].astype(np.float32)
    ) / 255.0

    # Center crop to square (up to 512x512) for isotropic radial frequency analysis
    side = min(h, w, 512)
    y0 = (h - side) // 2
    x0 = (w - side) // 2
    patch = lum[y0 : y0 + side, x0 : x0 + side]

    # Remove DC mean and apply 2D Hanning window to prevent boundary leakage
    patch = patch - float(np.mean(patch))
    win_1d = np.hanning(side).astype(np.float32)
    window = np.outer(win_1d, win_1d)
    fft_2d = np.fft.fftshift(np.fft.fft2(patch * window))
    power_spectrum = np.abs(fft_2d) ** 2 + 1e-12

    # Compute radial distance matrix from center
    cy, cx = side // 2, side // 2
    yy, xx = np.ogrid[:side, :side]
    r_grid = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2).astype(np.int32)

    max_r = side // 2
    if max_r < 16:
        return 0.35

    # Azimuthal average of log power spectrum per radius r
    radial_sum = np.bincount(r_grid.ravel(), weights=np.log10(power_spectrum).ravel())
    radial_cnt = np.bincount(r_grid.ravel())
    valid_r = np.arange(4, max_r)
    radial_profile = radial_sum[valid_r] / np.maximum(radial_cnt[valid_r], 1)

    log_r = np.log10(valid_r.astype(np.float64))

    # 1. Fit power-law slope: log10(P(r)) = slope * log10(r) + intercept
    slope, intercept = np.polyfit(log_r, radial_profile, 1)
    fitted = slope * log_r + intercept
    residuals = radial_profile - fitted

    # Natural portraits typically have power-law slope in [-3.3, -1.9].
    # Over-smoothed diffusion portraits drop too steeply (<-3.5) or have upsampling spikes (>-1.75).
    if -3.25 <= slope <= -1.95:
        slope_penalty = 0.0
    elif slope < -3.25:
        slope_penalty = min(1.0, (-3.25 - slope) / 1.1)
    else:
        slope_penalty = min(1.0, (slope - (-1.95)) / 0.8)

    # 2. High-frequency spectral residual spikes (checkerboard / latent decoder periodic artifacts)
    hf_mask = valid_r >= (max_r // 2)
    if np.any(hf_mask):
        hf_residuals = np.abs(residuals[hf_mask])
        spike_metric = float(np.percentile(hf_residuals, 95) - np.median(hf_residuals))
        spike_penalty = min(1.0, max(0.0, (spike_metric - 0.14) / 0.25))
    else:
        spike_penalty = 0.0

    # 3. Overall fit RMSE (deviation from natural scale-invariant 1/f law)
    rmse = float(np.sqrt(np.mean(residuals**2)))
    rmse_penalty = min(1.0, max(0.0, (rmse - 0.12) / 0.25))

    spectral_score = (0.45 * slope_penalty) + (0.35 * spike_penalty) + (0.20 * rmse_penalty)
    return round(float(max(0.0, min(1.0, spectral_score))), 4)


# ==========================================
# Stage 2B: Luminance-Invariant Facial Micro-Texture Forensics
# ==========================================
def compute_facial_microtexture_forensics(img_rgb: np.ndarray, landmarks) -> float:
    """Evaluates facial skin micro-texture, ocular-to-skin sharpness ratio, and RGB residual correlation.

    Normalized by local luminance to prevent false positives on dark skin tones and soft camera lighting
    (Directly addresses Section IV.C of the AurasMatch Project Proposal).
    """
    h, w = img_rgb.shape[:2]

    # Build anatomical mask of cheeks + forehead (excluding eyes, brows, lips)
    skin_mask = build_exclusion_mask(
        img_rgb.shape,
        landmarks,
        pos_polygons=[LEFT_CHEEK_POLYGON, RIGHT_CHEEK_POLYGON, FOREHEAD_SKIN_POLYGON],
        neg_polygons=[],
    )

    # Build peri-ocular reference mask to measure optical focus baseline
    eye_mask = build_exclusion_mask(
        img_rgb.shape,
        landmarks,
        pos_polygons=[LEFT_EYE_REF_POLYGON, RIGHT_EYE_REF_POLYGON],
        neg_polygons=[],
    )

    skin_ys, skin_xs = np.where(skin_mask > 0)
    if len(skin_xs) < 60:
        return 0.35

    img_float = img_rgb.astype(np.float32) / 255.0
    lum = 0.299 * img_float[:, :, 0] + 0.587 * img_float[:, :, 1] + 0.114 * img_float[:, :, 2]

    # Local luminance floor (0.18) prevents low-light / dark skin tone noise amplification bias
    local_lum = cv2.GaussianBlur(lum, (15, 15), 3.0)
    norm_factor = np.maximum(local_lum, 0.18)

    # 1. Fine high-pass residual (sensor grain + fine pore micro-texture)
    smooth_fine = cv2.GaussianBlur(lum, (3, 3), 0.9)
    hp_residual = (lum - smooth_fine) / norm_factor
    skin_hp = hp_residual[skin_mask > 0]

    # 2. Skin-to-Eye Sharpness Coherence ("Plastic/Wax Skin" vs. Soft Focus Discrimination)
    # In a soft-lit real human selfie, BOTH eyes and cheeks have lower Laplacian energy.
    # In AI slop / heavy synthetic generation, eyes/lashes are hyper-sharp while cheek skin has depleted micro-texture.
    laplacian_abs = np.abs(cv2.Laplacian(lum, cv2.CV_32F, ksize=3)) / norm_factor
    skin_sharpness = float(np.median(laplacian_abs[skin_mask > 0])) + 1e-6
    eye_pixels = laplacian_abs[eye_mask > 0]
    eye_sharpness = float(np.percentile(eye_pixels, 75)) + 1e-6 if len(eye_pixels) > 20 else skin_sharpness * 4.0

    # High eye-to-skin ratio (> 9.5) indicates hyper-sharp ocular rendering paired with plastic/wax skin
    eye_to_skin_ratio = eye_sharpness / skin_sharpness
    plasticity_penalty = min(1.0, max(0.0, (eye_to_skin_ratio - 7.5) / 10.0))

    # 3. High-Pass Residual Shannon Entropy (measures natural stochastic sensor grain vs synthetic flatness)
    hist, _ = np.histogram(np.clip(skin_hp, -0.15, 0.15), bins=32, range=(-0.15, 0.15), density=True)
    hist_probs = hist / (np.sum(hist) + 1e-12)
    nonzero_probs = hist_probs[hist_probs > 0]
    entropy = float(-np.sum(nonzero_probs * np.log2(nonzero_probs)))
    # Natural camera skin residuals typically have entropy >= 3.1 bits; over-smoothed synthetic patches < 2.5
    entropy_penalty = min(1.0, max(0.0, (3.05 - entropy) / 1.15))

    # 4. RGB Cross-Channel High-Pass Residual Correlation
    # Latent diffusion decoders synthesize R, G, B jointly from latent space, increasing cross-channel high-freq correlation
    r_hp = (img_float[:, :, 0] - cv2.GaussianBlur(img_float[:, :, 0], (3, 3), 0.9))[skin_mask > 0]
    g_hp = (img_float[:, :, 1] - cv2.GaussianBlur(img_float[:, :, 1], (3, 3), 0.9))[skin_mask > 0]
    b_hp = (img_float[:, :, 2] - cv2.GaussianBlur(img_float[:, :, 2], (3, 3), 0.9))[skin_mask > 0]

    def _safe_corr(x: np.ndarray, y: np.ndarray) -> float:
        sx, sy = float(np.std(x)), float(np.std(y))
        if sx < 1e-6 or sy < 1e-6:
            return 0.95
        c = float(np.corrcoef(x, y)[0, 1])
        return c if not math.isnan(c) else 0.85

    rg_corr = abs(_safe_corr(r_hp, g_hp))
    gb_corr = abs(_safe_corr(g_hp, b_hp))
    mean_corr = 0.5 * (rg_corr + gb_corr)
    # Very high cross-channel high-pass correlation (> 0.92) or near-zero variance suggests synthetic rendering
    corr_penalty = min(1.0, max(0.0, (mean_corr - 0.86) / 0.13))

    skin_ai_score = (0.45 * plasticity_penalty) + (0.35 * entropy_penalty) + (0.20 * corr_penalty)
    return round(float(max(0.0, min(1.0, skin_ai_score))), 4)


# ==========================================
# Stage 3 & Ensemble Fusion
# ==========================================
def evaluate_anti_ai_confidence(
    raw_bytes: bytes,
    img_rgb: np.ndarray,
    landmarks,
    vision_ai_score: Optional[float] = None,
    ai_threshold: float = 0.50,
) -> AntiAIForensicsResult:
    """Executes the 3-Stage Hybrid Anti-AI Filter (C2PA/Metadata + Spectral/Facial Forensics + Vision Model).

    Returns:
      - ai_confidence_score in [0.0, 1.0] (0.0 = 100% real human, 1.0 = 100% AI-generated)
      - is_human_verified: True if ai_confidence_score < ai_threshold
    """
    # Stage 1: Active C2PA & Metadata Provenance
    meta_res = inspect_c2pa_and_metadata(raw_bytes)

    # Stage 2: Passive CV Signal & Facial Micro-Texture Forensics
    spectral_score = compute_spectral_forensics(img_rgb)
    facial_texture_score = compute_facial_microtexture_forensics(img_rgb, landmarks)

    # Short-circuit if definitive AI C2PA manifest or generator signature was found in the raw file
    if meta_res["status"] == "ai_provenance_detected" and meta_res["metadata_ai_score"] is not None:
        final_ai_score = float(meta_res["metadata_ai_score"])
        return {
            "ai_confidence_score": round(final_ai_score, 4),
            "is_human_verified": final_ai_score < ai_threshold,
            "provenance_status": meta_res["status"],
            "metadata_ai_score": meta_res["metadata_ai_score"],
            "spectral_ai_score": spectral_score,
            "facial_texture_ai_score": facial_texture_score,
            "vision_ai_score": vision_ai_score,
        }

    # Combine Passive CV Forensics (Spectral + Luminance-Normalized Facial Micro-Texture)
    cv_forensics_score = (0.45 * spectral_score) + (0.55 * facial_texture_score)

    # Fuse with Stage 3 (Vision-Language Semantic AI Detection) if available
    if vision_ai_score is not None:
        fused_score = (0.55 * float(vision_ai_score)) + (0.45 * cv_forensics_score)
    else:
        fused_score = cv_forensics_score

    # Apply camera provenance adjustment if authentic camera EXIF/C2PA was present
    if meta_res["status"] == "camera_provenance_detected" and meta_res["metadata_ai_score"] is not None:
        fused_score = (0.75 * fused_score) + (0.25 * float(meta_res["metadata_ai_score"]))

    final_ai_score = round(float(max(0.0, min(1.0, fused_score))), 4)

    return {
        "ai_confidence_score": final_ai_score,
        "is_human_verified": final_ai_score < ai_threshold,
        "provenance_status": meta_res["status"],
        "metadata_ai_score": meta_res["metadata_ai_score"],
        "spectral_ai_score": spectral_score,
        "facial_texture_ai_score": facial_texture_score,
        "vision_ai_score": round(float(vision_ai_score), 4) if vision_ai_score is not None else None,
    }

