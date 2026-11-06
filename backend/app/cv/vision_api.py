import base64
from typing import Dict, List, Literal, Optional, TypedDict

import httpx

from app.core.config import settings

AestheticSubculture = Literal[
    "Jirai Kei",
    "Clean Girl",
    "Goth",
    "E-Girl",
    "Y2K",
    "Other",
]

SUBCULTURE_TARGETS: List[str] = ["Jirai Kei", "Clean Girl", "Goth", "E-Girl", "Y2K"]


class JevClassificationResult(TypedDict):
    choice: str
    subcultures: List[str]
    tags: List[str]
    score: float  # Kept as alias for subculture_confidence_score
    subculture_confidence_score: float
    vision_ai_score: Optional[float]
    probabilities: Dict[str, float]


def _build_jev_payload_and_headers(image_bytes: bytes) -> tuple[dict, dict]:
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": "jev-latest",
        "state": {
            "photo": "look-photo",
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
        "Authorization": f"Bearer {settings.jev_api_key}",
        "Content-Type": "application/json",
        "TypeSafe-Danger-Zone-Images": "true",
    }
    return payload, headers


def _parse_jev_response(data: dict) -> JevClassificationResult:
    answers = data.get("answers", {})

    # 1. Subculture classification answer
    choice_ans = answers.get("choice", {})
    selected_choice = choice_ans.get("choice", "Other")
    probabilities = choice_ans.get("probabilities", {})
    subculture_confidence = float(
        choice_ans.get("confidence", probabilities.get(selected_choice, 0.0))
    )

    # Map "E-girl" to "E-Girl" if the Postgres aesthetic_subculture enum uses "E-Girl"
    enum_choice = "E-Girl" if selected_choice == "E-girl" else selected_choice

    # 2. Semantic AI / Synthetic detection answer
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


def call_jev_model(image_bytes: bytes) -> JevClassificationResult:
    """Synchronous Jev classification + AI detection."""
    payload, headers = _build_jev_payload_and_headers(image_bytes)
    resp = httpx.post(settings.jev_api_url, json=payload, headers=headers, timeout=30.0)
    if resp.is_error:
        raise RuntimeError(f"Jev API {resp.status_code}: {resp.text}")
    return _parse_jev_response(resp.json())


async def classify_look_with_vision_model(image_bytes: bytes) -> JevClassificationResult:
    """Asynchronous Jev classification + AI detection."""
    payload, headers = _build_jev_payload_and_headers(image_bytes)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(settings.jev_api_url, json=payload, headers=headers)
        if resp.is_error:
            raise RuntimeError(f"Jev API {resp.status_code}: {resp.text}")
        return _parse_jev_response(resp.json())
