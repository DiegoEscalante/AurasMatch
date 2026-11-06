import asyncio
import io
from functools import lru_cache
from typing import Any, Dict, List, Optional
from uuid import uuid4

import boto3
import httpx
import numpy as np
from supabase import Client, create_client

from app.core.config import settings
from app.cv.color_math import RegionColorFeatures

try:
    import pandas as pd
except ImportError:
    pd = None

# ==========================================
# Category Mappings (matches images_scraper.py)
# ==========================================
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
    """Initializes and caches the Supabase client using the Secret / Service Role Key."""
    return create_client(
        settings.supabase_url,
        settings.supabase_secret_key,
    )


@lru_cache(maxsize=1)
def get_s3_client():
    """Initializes and caches the Cloudflare R2 S3 client."""
    if not (settings.r2_account_id and settings.r2_access_key and settings.r2_secret_key):
        raise ValueError("Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY) are not configured.")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
    )


def get_or_create_bot_user_id() -> str:
    """Ensures a valid system/bot user exists in Supabase Auth and public.profiles."""
    if settings.system_user_id:
        return settings.system_user_id

    supabase = get_supabase_client()
    bot_email = "bot@aurasmatch.local"
    bot_username = "aurasmatch_bot"

    users = supabase.auth.admin.list_users()
    bot_user = next((u for u in users if getattr(u, "email", None) == bot_email), None)

    if bot_user is None:
        created = supabase.auth.admin.create_user(
            {
                "email": bot_email,
                "password": str(uuid4()),
                "email_confirm": True,
                "user_metadata": {"username": bot_username},
            }
        )
        bot_user = created.user

    bot_id = str(bot_user.id)

    # Ensure row exists in public.profiles (username is NOT NULL UNIQUE)
    existing_profile = supabase.table("profiles").select("id").eq("id", bot_id).execute()
    if not existing_profile.data:
        supabase.table("profiles").insert(
            {
                "id": bot_id,
                "username": bot_username,
            }
        ).execute()

    return bot_id


def _verify_supabase_jwt_sync(token: str) -> str:
    """Validates a user's Supabase JWT access token and returns their verified user UUID."""
    supabase = get_supabase_client()
    user_resp = supabase.auth.get_user(token)
    if user_resp is None or getattr(user_resp, "user", None) is None or not user_resp.user.id:
        raise ValueError("Invalid or expired Supabase token.")
    return str(user_resp.user.id)


async def verify_supabase_jwt(token: str) -> str:
    """Asynchronously validates a user's Supabase JWT access token and returns their UUID."""
    return await asyncio.to_thread(_verify_supabase_jwt_sync, token)


@lru_cache(maxsize=1)
def load_product_catalog():
    """Loads and caches the product catalog from Supabase (`id, category, cielab_l, cielab_a, cielab_b`)."""
    supabase = get_supabase_client()
    res = supabase.table("products").select("id, category, cielab_l, cielab_a, cielab_b").execute()
    rows = res.data or []
    if pd is not None:
        return pd.DataFrame(rows)
    return rows


def find_closest_sku(lab_coords, category_filter: List[str], catalog) -> Optional[int]:
    """Finds the product SKU with minimum Euclidean Delta E in CIELAB space."""
    if lab_coords is None:
        return None

    if pd is not None and isinstance(catalog, pd.DataFrame):
        if catalog.empty:
            return None
        subset = catalog[catalog["category"].isin(category_filter)].copy()
        subset = subset.dropna(subset=["id", "cielab_l", "cielab_a", "cielab_b"])
        if subset.empty:
            return None

        subset["delta_e"] = np.sqrt(
            (subset["cielab_l"] - lab_coords[0]) ** 2
            + (subset["cielab_a"] - lab_coords[1]) ** 2
            + (subset["cielab_b"] - lab_coords[2]) ** 2
        )
        return int(subset.loc[subset["delta_e"].idxmin()]["id"])

    # Fallback when catalog is a list of dicts (without pandas)
    best_id: Optional[int] = None
    best_delta_e = float("inf")
    cat_set = set(category_filter)
    for row in catalog:
        if (
            row.get("category") in cat_set
            and row.get("id") is not None
            and row.get("cielab_l") is not None
            and row.get("cielab_a") is not None
            and row.get("cielab_b") is not None
        ):
            de = float(
                np.sqrt(
                    (float(row["cielab_l"]) - float(lab_coords[0])) ** 2
                    + (float(row["cielab_a"]) - float(lab_coords[1])) ** 2
                    + (float(row["cielab_b"]) - float(lab_coords[2])) ** 2
                )
            )
            if de < best_delta_e:
                best_delta_e = de
                best_id = int(row["id"])
    return best_id


def _match_skus_across_regions_sync(
    regions_color: Dict[str, RegionColorFeatures],
    catalog=None,
) -> Dict[str, Dict[str, Any]]:
    """Matches closest SKUs per category for each extracted facial region (matches images_scraper.py)."""
    if catalog is None:
        catalog = load_product_catalog()

    extracted_data: Dict[str, Dict[str, Any]] = {}

    for region, target_categories in REGION_TO_CATEGORIES.items():
        color_info = regions_color.get(region)
        if not color_info:
            continue

        hex_val = color_info.get("dominant_hex")
        lab_coords = color_info.get("cielab")

        if hex_val and lab_coords is not None:
            sku_matches: Dict[str, int] = {}
            for category in target_categories:
                best_sku = find_closest_sku(lab_coords, [category], catalog)
                if best_sku is not None:
                    sku_matches[category] = best_sku

            extracted_data[region] = {
                "hex_value": hex_val,
                "recommended_skus": sku_matches,
            }

    return extracted_data


async def match_skus_for_regions(
    regions_color: Dict[str, RegionColorFeatures],
    catalog=None,
) -> Dict[str, Dict[str, Any]]:
    """Asynchronously computes the closest product SKU recommendations for all extracted regions."""
    return await asyncio.to_thread(_match_skus_across_regions_sync, regions_color, catalog)


def upload_jpeg_to_r2_sync(jpeg_bytes: bytes, folder: str = "scraped_looks") -> str:
    """Uploads JPEG bytes to Cloudflare R2 and returns the R2 object path."""
    s3 = get_s3_client()
    file_id = str(uuid4())
    r2_path = f"{folder.strip('/')}/{file_id}.jpg"
    s3.upload_fileobj(
        io.BytesIO(jpeg_bytes),
        settings.r2_bucket,
        r2_path,
        ExtraArgs={"ContentType": "image/jpeg"},
    )
    return r2_path


async def upload_jpeg_to_r2(jpeg_bytes: bytes, folder: str = "scraped_looks") -> str:
    """Asynchronously uploads JPEG bytes to Cloudflare R2."""
    return await asyncio.to_thread(upload_jpeg_to_r2_sync, jpeg_bytes, folder)


def _download_from_r2_sync(r2_key: str) -> bytes:
    s3 = get_s3_client()
    obj = s3.get_object(Bucket=settings.r2_bucket, Key=r2_key.lstrip("/"))
    return obj["Body"].read()


async def download_image_bytes(image_url_or_path: str) -> bytes:
    """Downloads image bytes from an HTTP(S) URL or directly from a Cloudflare R2 object path."""
    if image_url_or_path.startswith(("http://", "https://")):
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(image_url_or_path)
            response.raise_for_status()
            return response.content
    return await asyncio.to_thread(_download_from_r2_sync, image_url_or_path)


def _insert_look_record_sync(
    user_id: str,
    image_path: str,
    subculture: List[str],
    is_human_verified: bool,
    ai_confidence_score: float,
    subculture_confidence_score: float,
    extracted_regions: Dict[str, Any],
    tags: Optional[List[str]] = None,
) -> str:
    """Inserts the analyzed look row into the Supabase looks table and returns looks.id (UUID)."""
    client = get_supabase_client()

    db_record = {
        "user_id": user_id,
        "image_path": image_path,
        "is_human_verified": is_human_verified,
        "ai_confidence_score": ai_confidence_score,
        "subculture_confidence_score": subculture_confidence_score,
        "subculture": subculture,
        "tags": tags if tags is not None else [],
        "extracted_regions": extracted_regions,
    }

    try:
        response = client.table("looks").insert(db_record).execute()
    except Exception as exc:
        if "subculture_confidence_score" in str(exc):
            fallback_record = {k: v for k, v in db_record.items() if k != "subculture_confidence_score"}
            response = client.table("looks").insert(fallback_record).execute()
        else:
            raise
    if not response.data or "id" not in response.data[0]:
        raise RuntimeError("Supabase INSERT into 'looks' table did not return a record ID.")

    return str(response.data[0]["id"])


async def insert_look_record(
    user_id: str,
    image_path: str,
    subculture: List[str],
    is_human_verified: bool,
    ai_confidence_score: float,
    subculture_confidence_score: float,
    extracted_regions: Dict[str, Any],
    tags: Optional[List[str]] = None,
) -> str:
    """Asynchronously writes the complete look analysis to the Supabase looks table."""
    return await asyncio.to_thread(
        _insert_look_record_sync,
        user_id,
        image_path,
        subculture,
        is_human_verified,
        ai_confidence_score,
        subculture_confidence_score,
        extracted_regions,
        tags,
    )
