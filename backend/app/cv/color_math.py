import math
from typing import Dict, Tuple, TypedDict

import cv2
import numpy as np

try:
    from sklearn.cluster import KMeans
except ImportError:
    KMeans = None


class RegionColorFeatures(TypedDict):
    dominant_hex: str
    cielab: Tuple[float, float, float]


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Formats an RGB triplet (0-255) into an uppercase hexadecimal color string."""
    r_clamped = max(0, min(255, int(round(r))))
    g_clamped = max(0, min(255, int(round(g))))
    b_clamped = max(0, min(255, int(round(b))))
    return f"#{r_clamped:02X}{g_clamped:02X}{b_clamped:02X}"


def rgb_to_cielab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Converts sRGB (0-255) to CIELAB (L*, a*, b*) under D65 reference white."""
    r_norm = max(0.0, min(1.0, r / 255.0))
    g_norm = max(0.0, min(1.0, g / 255.0))
    b_norm = max(0.0, min(1.0, b / 255.0))

    def gamma_correct(c: float) -> float:
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    r_lin = gamma_correct(r_norm)
    g_lin = gamma_correct(g_norm)
    b_lin = gamma_correct(b_norm)

    # sRGB to CIE XYZ (D65)
    x = (r_lin * 0.4124 + g_lin * 0.3576 + b_lin * 0.1805) * 100.0
    y = (r_lin * 0.2126 + g_lin * 0.7152 + b_lin * 0.0722) * 100.0
    z = (r_lin * 0.0193 + g_lin * 0.1192 + b_lin * 0.9505) * 100.0

    # Normalize by D65 Reference White
    x /= 95.047
    y /= 100.000
    z /= 108.883

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)

    fx, fy, fz = f(x), f(y), f(z)

    l_val = (116.0 * fy) - 16.0
    a_val = 500.0 * (fx - fy)
    b_val = 200.0 * (fy - fz)

    return round(l_val, 3), round(a_val, 3), round(b_val, 3)


def calculate_delta_e(
    lab1: Tuple[float, float, float],
    lab2: Tuple[float, float, float],
) -> float:
    """Computes the CIE76 Delta E Euclidean distance between two CIELAB colors."""
    dl = lab1[0] - lab2[0]
    da = lab1[1] - lab2[1]
    db = lab1[2] - lab2[2]
    return math.sqrt(dl * dl + da * da + db * db)


def extract_dominant_color_from_masked_region(
    masked_bgr: np.ndarray,
    n_clusters: int = 3,
) -> RegionColorFeatures:
    """Runs K-Means strictly on non-zero ([0, 0, 0] excluded) polygon-masked pixels."""
    img_rgb = cv2.cvtColor(masked_bgr, cv2.COLOR_BGR2RGB)
    flat_pixels = img_rgb.reshape(-1, 3)

    # Strictly ignore [0, 0, 0] mask background pixels
    non_zero_mask = np.any(flat_pixels != 0, axis=1)
    active_pixels = flat_pixels[non_zero_mask]

    if len(active_pixels) == 0:
        raise ValueError("Masked facial region contains no non-zero pixels.")

    # Downsample if necessary to keep K-Means fast
    max_samples = 2500
    if len(active_pixels) > max_samples:
        rng = np.random.default_rng(42)
        sample_idx = rng.choice(len(active_pixels), size=max_samples, replace=False)
        sample_pixels = active_pixels[sample_idx].astype(np.float32)
    else:
        sample_pixels = active_pixels.astype(np.float32)

    k = min(n_clusters, len(sample_pixels))
    if k <= 1:
        mean_rgb = np.mean(sample_pixels, axis=0)
        r, g, b = int(round(mean_rgb[0])), int(round(mean_rgb[1])), int(round(mean_rgb[2]))
    elif KMeans is not None:
        kmeans = KMeans(n_clusters=k, n_init=5, random_state=42)
        labels = kmeans.fit_predict(sample_pixels)
        counts = np.bincount(labels)
        dominant_idx = int(np.argmax(counts))
        center = kmeans.cluster_centers_[dominant_idx]
        r, g, b = int(round(center[0])), int(round(center[1])), int(round(center[2]))
    else:
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
        _, labels, centers = cv2.kmeans(
            sample_pixels,
            k,
            None,
            criteria,
            5,
            cv2.KMEANS_PP_CENTERS,
        )
        counts = np.bincount(labels.flatten())
        dominant_idx = int(np.argmax(counts))
        center = centers[dominant_idx]
        r, g, b = int(round(center[0])), int(round(center[1])), int(round(center[2]))

    return {
        "dominant_hex": rgb_to_hex(r, g, b),
        "cielab": rgb_to_cielab(r, g, b),
    }


def extract_all_regions_color_math(
    masked_regions: Dict[str, np.ndarray],
) -> Dict[str, RegionColorFeatures]:
    """Extracts dominant Hex and CIELAB coordinates for all four masked anatomical regions."""
    return {
        region_name: extract_dominant_color_from_masked_region(masked_bgr)
        for region_name, masked_bgr in masked_regions.items()
    }
