from typing import Dict, List

import cv2
import mediapipe as mp
import numpy as np

# 1. Lips: Outer lip contour minus inner mouth opening
LIP_OUTER_POLYGON: List[int] = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
]
LIP_INNER_POLYGON: List[int] = [
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324,
    308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
]

# 2. Brows: Left and Right eyebrow contours
LEFT_BROW_POLYGON: List[int] = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
RIGHT_BROW_POLYGON: List[int] = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]

# 3. Eyelids (Crease / Eyeshadow zone above upper lid fold, excluding sclera)
LEFT_EYELID_CREASE_POLYGON: List[int] = [
    226, 247, 30, 29, 27, 28, 56, 190,
    243, 173, 157, 158, 159, 160, 161, 246,
]
RIGHT_EYELID_CREASE_POLYGON: List[int] = [
    463, 414, 286, 258, 257, 259, 260, 467,
    446, 466, 388, 387, 386, 385, 384, 398,
]

# 4. Lash Line (Tight palpebral rim for eyeliner & mascara, with sclera/iris masked out)
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


def _landmarks_to_points(landmarks, indices: List[int], img_w: int, img_h: int) -> np.ndarray:
    """Maps normalized MediaPipe landmark indices to integer pixel coordinate arrays."""
    return np.array(
        [(int(landmarks[idx].x * img_w), int(landmarks[idx].y * img_h)) for idx in indices],
        dtype=np.int32,
    )


def _apply_polygon_mask(
    img_bgr: np.ndarray,
    include_polygons: List[np.ndarray],
    exclude_polygons: List[np.ndarray] | None = None,
) -> np.ndarray:
    """Applies cv2.fillPoly and cv2.bitwise_and to isolate only target polygon pixels in-memory."""
    h, w, _ = img_bgr.shape
    mask = np.zeros((h, w), dtype=np.uint8)

    cv2.fillPoly(mask, include_polygons, 255)
    if exclude_polygons:
        cv2.fillPoly(mask, exclude_polygons, 0)

    # Tight bounding-box slice around non-zero mask pixels to minimize memory footprint
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        raise ValueError("Polygon mask produced zero active pixels for facial region.")

    x1, x2 = int(np.min(xs)), int(np.max(xs)) + 1
    y1, y2 = int(np.min(ys)), int(np.max(ys)) + 1

    roi_bgr = img_bgr[y1:y2, x1:x2]
    roi_mask = mask[y1:y2, x1:x2]

    return cv2.bitwise_and(roi_bgr, roi_bgr, mask=roi_mask)


def extract_masked_facial_regions(image_bytes: bytes) -> Dict[str, np.ndarray]:
    """Segments Lips, Brows, Eyelids (crease), and Lash Line in-memory using MediaPipe polygon masks.

    Returns a dictionary mapping region names ('lips', 'brows', 'eyelids', 'lash_line')
    to BGR numpy arrays where all non-target pixels are zeroed ([0, 0, 0]).
    """
    if not image_bytes:
        raise ValueError("Empty image bytes provided.")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Could not decode image bytes into a valid OpenCV image.")

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w, _ = img_bgr.shape

    mp_solutions = getattr(mp, "solutions", None)
    if mp_solutions is not None and hasattr(mp_solutions, "face_mesh"):
        with mp_solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        ) as face_mesh:
            results = face_mesh.process(img_rgb)
            if not results.multi_face_landmarks:
                raise ValueError("No face detected in the provided image.")

            lms = results.multi_face_landmarks[0].landmark

            # 1. Lips (Outer contour minus inner mouth opening)
            lips_masked = _apply_polygon_mask(
                img_bgr,
                include_polygons=[_landmarks_to_points(lms, LIP_OUTER_POLYGON, w, h)],
                exclude_polygons=[_landmarks_to_points(lms, LIP_INNER_POLYGON, w, h)],
            )

            # 2. Brows (Left + Right eyebrows)
            brows_masked = _apply_polygon_mask(
                img_bgr,
                include_polygons=[
                    _landmarks_to_points(lms, LEFT_BROW_POLYGON, w, h),
                    _landmarks_to_points(lms, RIGHT_BROW_POLYGON, w, h),
                ],
            )

            # 3. Eyelids / Crease (Left + Right upper eyelid fold, excluding sclera)
            eyelids_masked = _apply_polygon_mask(
                img_bgr,
                include_polygons=[
                    _landmarks_to_points(lms, LEFT_EYELID_CREASE_POLYGON, w, h),
                    _landmarks_to_points(lms, RIGHT_EYELID_CREASE_POLYGON, w, h),
                ],
                exclude_polygons=[
                    _landmarks_to_points(lms, LEFT_EYE_SCLERA_POLYGON, w, h),
                    _landmarks_to_points(lms, RIGHT_EYE_SCLERA_POLYGON, w, h),
                ],
            )

            # 4. Lash Line (Left + Right lash rims, explicitly masking out white sclera & iris)
            lash_line_masked = _apply_polygon_mask(
                img_bgr,
                include_polygons=[
                    _landmarks_to_points(lms, LEFT_LASH_LINE_POLYGON, w, h),
                    _landmarks_to_points(lms, RIGHT_LASH_LINE_POLYGON, w, h),
                ],
                exclude_polygons=[
                    _landmarks_to_points(lms, LEFT_EYE_SCLERA_POLYGON, w, h),
                    _landmarks_to_points(lms, RIGHT_EYE_SCLERA_POLYGON, w, h),
                ],
            )

            return {
                "lips": lips_masked,
                "brows": brows_masked,
                "eyelids": eyelids_masked,
                "lash_line": lash_line_masked,
            }

    raise RuntimeError(
        "MediaPipe FaceMesh (mp.solutions.face_mesh) is required for anatomical polygon masking."
    )
