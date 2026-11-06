# AurasMatch AI Microservice (`backend`)

FastAPI computer vision, subculture classification, and cosmetic recommendation microservice for AurasMatch.

## Features
- **MediaPipe Face Landmarker (`face_landmarker.task`)**: Segments facial regions (`lips`, `brows`, `eyelids`, `lash_line`) using positive/negative polygon exclusion masks.
- **Color Extraction & Delta E Product Recommendation**: Extracts dominant region color (`hex_value`) and CIELAB coordinates, recommending the closest SKU per product category (`lipstick`, `lip_liner`, `eyebrow`, `eyeshadow`, `eyeliner`, `mascara`) from the Supabase `products` catalog.
- **Jev Subculture Classification (`jev-latest`)**: Classifies makeup portrait aesthetics into `Jirai Kei`, `Clean Girl`, `Goth`, `E-Girl`, `Y2K` (or `Other`) with confidence scores and probability distributions.
- **Cloudflare R2 + Supabase Integration**: Uploads normalized JPEGs to R2 (`auras-match` bucket) and inserts structured records into `public.looks`.

## Endpoints
- `GET /health` — Health check endpoint.
- `POST /analyze-look` — Analyzes a look from `image_url` (HTTP URL or R2 object path) or `image_base64`, matches SKUs, classifies subculture, runs the 3-Stage Hybrid Anti-AI Engine, and inserts into `looks`.
- `POST /analyze-look/upload` — Accepts a binary or multipart image upload, uploads to R2, and runs the full analysis pipeline.

## Local Development
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Docker Build & Run
```bash
cd backend
docker build -t aurasmatch-backend .
docker run -p 8000:8000 --env-file app/core/.env aurasmatch-backend
```

