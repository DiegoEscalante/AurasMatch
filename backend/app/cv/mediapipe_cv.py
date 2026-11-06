import os
import threading
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ==========================================
# MediaPipe Indices & Region Definitions
# ==========================================
LIP_OUTER_POLYGON: List[int] = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
]
LIP_INNER_POLYGON: List[int] = [
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324,
    308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
]
LEFT_BROW_POLYGON: List[int] = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
RIGHT_BROW_POLYGON: List[int] = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
LEFT_EYELID_CREASE_POLYGON: List[int] = [
    226, 247, 30, 29, 27, 28, 56, 190,
    243, 173, 157, 158, 159, 160, 161, 246,
]
RIGHT_EYELID_CREASE_POLYGON: List[int] = [
    463, 414, 286, 258, 257, 259, 260, 467,
    446, 466, 388, 387, 386, 385, 384, 398,
]
LEFT_EYE_SCLERA_POLYGON: List[int] = [
    33, 246, 161, 160, 159, 158, 157, 173,
    133, 155, 154, 153, 145, 144, 163, 7,
]
RIGHT_EYE_SCLERA_POLYGON: List[int] = [
    263, 466, 388, 387, 386, 385, 384, 398,
    362, 382, 381, 380, 374, 373, 390, 249,
]
LEFT_LASH_LINE_POLYGON: List[int] = [
    33, 246, 161, 160, 159, 158, 157, 173,
    133, 243, 112, 26, 22, 23, 24, 110, 25, 130,
]
RIGHT_LASH_LINE_POLYGON: List[int] = [
    263, 466, 388, 387, 386, 385, 384, 398,
    362, 463, 341, 256, 252, 253, 254, 339, 255, 359,
]

REGION_DEFINITIONS: Dict[str, Dict[str, List[List[int]]]] = {
    "lips": {"pos": [LIP_OUTER_POLYGON], "neg": [LIP_INNER_POLYGON]},
    "brows": {"pos": [LEFT_BROW_POLYGON, RIGHT_BROW_POLYGON], "neg": []},
    "eyelids": {"pos": [LEFT_EYELID_CREASE_POLYGON, RIGHT_EYELID_CREASE_POLYGON], "neg": []},
    "lash_line": {
        "pos": [LEFT_LASH_LINE_POLYGON, RIGHT_LASH_LINE_POLYGON],
        "neg": [LEFT_EYE_SCLERA_POLYGON, RIGHT_EYE_SCLERA_POLYGON],
    },
}

_landmarker_lock = threading.Lock()
_face_landmarker: vision.FaceLandmarker | None = None


def _resolve_model_path() -> str:
    """Resolves the path to face_landmarker.task inside backend or scripts directory."""
    env_path = os.getenv("FACE_LANDMARKER_MODEL_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    cv_dir = Path(__file__).resolve().parent
    candidates = [
        cv_dir / "models" / "face_landmarker.task",
        cv_dir.parents[1] / "models" / "face_landmarker.task",
        cv_dir.parents[2] / "scripts" / "data_ingestion" / "models" / "face_landmarker.task",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)

    raise FileNotFoundError(
        f"Could not find 'face_landmarker.task'. Checked: {[str(c) for c in candidates]}"
    )


def get_face_landmarker() -> vision.FaceLandmarker:
    """Initializes and returns the singleton MediaPipe FaceLandmarker instance."""
    global _face_landmarker
    if _face_landmarker is None:
        model_path = _resolve_model_path()
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
        )
        _face_landmarker = vision.FaceLandmarker.create_from_options(options)
    return _face_landmarker


def build_exclusion_mask(
    img_shape: Tuple[int, ...],
    landmarks,
    pos_polygons: List[List[int]],
    neg_polygons: List[List[int]],
) -> np.ndarray:
    """Draws white positive polygons, then overwrites exclusions with black."""
    h, w = img_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    for poly in pos_polygons:
        pts = np.array(
            [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in poly],
            np.int32,
        )
        cv2.fillPoly(mask, [pts], 255)

    for poly in neg_polygons:
        pts = np.array(
            [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in poly],
            np.int32,
        )
        cv2.fillPoly(mask, [pts], 0)

    return mask


def decode_image_to_rgb_and_jpeg(
    image_bytes: bytes,
    max_dimension: int = 1280,
) -> Tuple[np.ndarray, np.ndarray, bytes]:
    """Decodes raw image bytes into BGR, RGB numpy arrays, and normalized JPEG bytes.

    Caps the maximum image dimension to `max_dimension` (1280px) to prevent 4K/8K photos
    from exhausting Cloud Run container RAM while preserving full facial landmark & color accuracy.
    """
    if not image_bytes:
        raise ValueError("Empty image bytes provided.")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Could not decode image bytes into a valid OpenCV image.")

    h, w = img_bgr.shape[:2]
    if max(h, w) > max_dimension:
        scale = max_dimension / float(max(h, w))
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        img_bgr = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)

    ok, jpeg_buf = cv2.imencode(".jpg", img_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise ValueError("Could not encode image to JPEG format.")

    jpeg_bytes = jpeg_buf.tobytes()
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return img_bgr, img_rgb, jpeg_bytes


def detect_face_landmarks(img_rgb: np.ndarray):
    """Detects facial landmarks on an RGB image using MediaPipe Tasks FaceLandmarker."""
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    with _landmarker_lock:
        landmarker = get_face_landmarker()
        detection_result = landmarker.detect(mp_image)

    if not detection_result.face_landmarks:
        raise ValueError("No face detected in the provided image.")

    return detection_result.face_landmarks[0]


def extract_masked_facial_regions(image_bytes: bytes) -> Dict[str, Tuple[np.ndarray, np.ndarray]]:
    """Decodes image, runs FaceLandmarker, and returns (img_rgb, mask) per facial region."""
    img_bgr, img_rgb, _ = decode_image_to_rgb_and_jpeg(image_bytes)
    landmarks = detect_face_landmarks(img_rgb)

    regions: Dict[str, Tuple[np.ndarray, np.ndarray]] = {}
    for region, defs in REGION_DEFINITIONS.items():
        mask = build_exclusion_mask(img_bgr.shape, landmarks, defs["pos"], defs["neg"])
        regions[region] = (img_rgb, mask)

    return regions
