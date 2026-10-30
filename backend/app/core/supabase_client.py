import asyncio
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client, create_client

from app.core.config import settings
from app.cv.color_math import RegionColorFeatures, calculate_delta_e

# Explicit mapping from the 4 segmented anatomical regions to the 6 target product categories
REGION_TO_CATEGORIES: Dict[str, List[str]] = {
    "lips": ["lipstick", "lip_liner"],
    "brows": ["eyebrow"],
    "eyelids": ["eyeshadow"],
    "lash_line": ["eyeliner", "mascara"],
}

ALL_TARGET_CATEGORIES: List[str] = [
    "lipstick",
    "lip_liner",
    "eyeliner",
    "eyeshadow",
    "mascara",
    "eyebrow",
]


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Initializes and caches the Supabase client using the Service Role Key to bypass RLS."""
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def _match_skus_across_regions_sync(
    regions_color: Dict[str, RegionColorFeatures],
) -> Dict[str, Dict[str, Any]]:
    """Queries products for all 6 target categories and computes lowest Delta E SKU matches per region."""
    client = get_supabase_client()

    response = (
        client.table("products")
        .select("id, category, cielab_l, cielab_a, cielab_b")
        .in_("category", ALL_TARGET_CATEGORIES)
        .execute()
    )
    products = response.data or []

    # Group valid products by category for fast in-memory Delta E calculation
    products_by_category: Dict[str, List[Dict[str, Any]]] = {cat: [] for cat in ALL_TARGET_CATEGORIES}
    for row in products:
        cat = row.get("category")
        if (
            cat in products_by_category
            and row.get("id") is not None
            and row.get("cielab_l") is not None
            and row.get("cielab_a") is not None
            and row.get("cielab_b") is not None
        ):
            products_by_category[cat].append(row)

    extracted_regions_payload: Dict[str, Dict[str, Any]] = {}

    for region_name, target_categories in REGION_TO_CATEGORIES.items():
        color_info = regions_color[region_name]
        target_lab: Tuple[float, float, float] = color_info["cielab"]

        matched_skus_by_category: Dict[str, Optional[int]] = {}
        closest_overall_sku_id: Optional[int] = None
        closest_overall_delta_e = float("inf")

        for category in target_categories:
            best_cat_sku_id: Optional[int] = None
            best_cat_delta_e = float("inf")

            for prod in products_by_category.get(category, []):
                prod_lab = (
                    float(prod["cielab_l"]),
                    float(prod["cielab_a"]),
                    float(prod["cielab_b"]),
                )
                delta_e = calculate_delta_e(target_lab, prod_lab)

                if delta_e < best_cat_delta_e:
                    best_cat_delta_e = delta_e
                    best_cat_sku_id = int(prod["id"])

                if delta_e < closest_overall_delta_e:
                    closest_overall_delta_e = delta_e
                    closest_overall_sku_id = int(prod["id"])

            matched_skus_by_category[category] = best_cat_sku_id

        extracted_regions_payload[region_name] = {
            "dominant_hex": color_info["dominant_hex"],
            "cielab": {
                "l": target_lab[0],
                "a": target_lab[1],
                "b": target_lab[2],
            },
            "closest_sku_id": closest_overall_sku_id,
            "category_matches": matched_skus_by_category,
        }

    return extracted_regions_payload


async def match_skus_for_regions(
    regions_color: Dict[str, RegionColorFeatures],
) -> Dict[str, Dict[str, Any]]:
    """Asynchronously computes the closest product SKU matches for all 4 masked regions."""
    return await asyncio.to_thread(_match_skus_across_regions_sync, regions_color)


def _insert_look_record_sync(
    user_id: str,
    image_path: str,
    subculture: str,
    is_human_verified: bool,
    ai_confidence_score: float,
    extracted_regions: Dict[str, Any],
) -> str:
    """Inserts the analyzed look row into the Supabase looks table and returns looks.id (UUID)."""
    client = get_supabase_client()

    row = {
        "user_id": user_id,
        "image_path": image_path,
        "subculture": subculture,
        "is_human_verified": is_human_verified,
        "ai_confidence_score": ai_confidence_score,
        "extracted_regions": extracted_regions,
    }

    response = client.table("looks").insert(row).execute()
    if not response.data or "id" not in response.data[0]:
        raise RuntimeError("Supabase INSERT into 'looks' table did not return a record ID.")

    return str(response.data[0]["id"])


async def insert_look_record(
    user_id: str,
    image_path: str,
    subculture: str,
    is_human_verified: bool,
    ai_confidence_score: float,
    extracted_regions: Dict[str, Any],
) -> str:
    """Asynchronously writes the complete look analysis to the Supabase looks table using the Service Role Key."""
    return await asyncio.to_thread(
        _insert_look_record_sync,
        user_id,
        image_path,
        subculture,
        is_human_verified,
        ai_confidence_score,
        extracted_regions,
    )
