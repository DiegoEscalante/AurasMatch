from typing import Literal, TypedDict

import httpx

from app.core.config import settings

AestheticSubculture = Literal[
    "Jirai Kei",
    "Clean Girl",
    "Goth",
    "E-Girl",
    "Y2K",
    "Uncategorized",
]

AESTHETIC_SUBCULTURE_LABELS: list[str] = [
    "Jirai Kei",
    "Clean Girl",
    "Goth",
    "E-Girl",
    "Y2K",
    "Uncategorized",
]


class VisualDecisionResult(TypedDict):
    subculture: AestheticSubculture
    is_human_verified: bool
    ai_confidence_score: float


async def classify_look_with_vision_model(image_url: str) -> VisualDecisionResult:
    """Queries the categorical Visual Decision Model (e.g., Jev) for subculture enum & anti-AI score."""
    headers = {
        "Authorization": f"Bearer {settings.vision_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "image_url": image_url,
        "candidate_labels": AESTHETIC_SUBCULTURE_LABELS,
        "detect_synthetic": True,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.vision_api_url,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    raw_label = str(data.get("subculture") or data.get("label") or "Uncategorized").strip()
    subculture: AestheticSubculture = (
        raw_label if raw_label in AESTHETIC_SUBCULTURE_LABELS else "Uncategorized"  # type: ignore[assignment]
    )

    raw_ai_score = float(data.get("ai_confidence_score", data.get("synthetic_probability", 0.0)))
    ai_confidence_score = round(max(0.0, min(1.0, raw_ai_score)), 4)

    if "is_human_verified" in data and isinstance(data["is_human_verified"], bool):
        is_human_verified = data["is_human_verified"]
    else:
        is_human_verified = ai_confidence_score < 0.5

    return {
        "subculture": subculture,
        "is_human_verified": is_human_verified,
        "ai_confidence_score": ai_confidence_score,
    }
