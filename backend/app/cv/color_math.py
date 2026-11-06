import math
from typing import Dict, Optional, Tuple, TypedDict

import numpy as np


class RegionColorFeatures(TypedDict):
    dominant_hex: str
    cielab: Tuple[float, float, float]


def rgb_to_hex(rgb) -> str:
    """Formats an RGB sequence (0-255) into a lowercase hexadecimal color string (#rrggbb)."""
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def rgb_to_cielab(r: float, g: float, b: float) -> Tuple[float, float, float]:
    """Converts sRGB (0-255) to CIELAB (L*, a*, b*) under D65 reference white (matches skimage.color.rgb2lab)."""
    r_norm = max(0.0, min(1.0, float(r) / 255.0))
    g_norm = max(0.0, min(1.0, float(g) / 255.0))
    b_norm = max(0.0, min(1.0, float(b) / 255.0))

    def gamma_correct(c: float) -> float:
        return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

    r_lin = gamma_correct(r_norm)
    g_lin = gamma_correct(g_norm)
    b_lin = gamma_correct(b_norm)

    # sRGB to CIE XYZ (D65)
    x = (r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375) * 100.0
    y = (r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750) * 100.0
    z = (r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041) * 100.0

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

    return float(l_val), float(a_val), float(b_val)


def calculate_delta_e(
    lab1: Tuple[float, float, float] | np.ndarray,
    lab2: Tuple[float, float, float] | np.ndarray,
) -> float:
    """Computes the CIE76 Delta E Euclidean distance between two CIELAB colors."""
    dl = float(lab1[0]) - float(lab2[0])
    da = float(lab1[1]) - float(lab2[1])
    db = float(lab1[2]) - float(lab2[2])
    return math.sqrt(dl * dl + da * da + db * db)


def get_dominant_color_and_lab(
    img_rgb: np.ndarray,
    mask: np.ndarray,
) -> Tuple[Optional[str], Optional[np.ndarray]]:
    """Extracts dominant color hex and CIELAB coordinates matching images_scraper.py.

    Note: For k=1 cluster (KMeans(n_clusters=1)), the cluster centroid is mathematically identical
    to the arithmetic mean of the non-black masked pixels, with zero extra memory allocation.
    """
    masked_pixels = img_rgb[mask > 0]
    if len(masked_pixels) == 0:
        return None, None

    non_black_pixels = masked_pixels[np.any(masked_pixels != 0, axis=1)]
    if len(non_black_pixels) == 0:
        return None, None

    dominant_rgb = np.mean(non_black_pixels, axis=0)
    lab = np.array(
        rgb_to_cielab(dominant_rgb[0], dominant_rgb[1], dominant_rgb[2]),
        dtype=np.float64,
    )

    return rgb_to_hex(dominant_rgb), lab


def extract_all_regions_color_math(
    masked_regions: Dict[str, Tuple[np.ndarray, np.ndarray]],
) -> Dict[str, RegionColorFeatures]:
    """Extracts dominant Hex and CIELAB coordinates for all masked anatomical regions."""
    results: Dict[str, RegionColorFeatures] = {}
    for region_name, (img_rgb, mask) in masked_regions.items():
        hex_val, lab_coords = get_dominant_color_and_lab(img_rgb, mask)
        if hex_val is not None and lab_coords is not None:
            results[region_name] = {
                "dominant_hex": hex_val,
                "cielab": (float(lab_coords[0]), float(lab_coords[1]), float(lab_coords[2])),
            }
    return results
