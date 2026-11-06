FROM python:3.12-slim

# Install system dependencies required by OpenCV and MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project configuration and install dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application code and MediaPipe model
COPY app ./app

# Ensure face_landmarker.task exists even if omitted from git
RUN mkdir -p /app/app/cv/models && \
    if [ ! -f /app/app/cv/models/face_landmarker.task ]; then \
        curl -fL "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" \
        -o /app/app/cv/models/face_landmarker.task; \
    fi

ENV PORT=8000
ENV OPENBLAS_NUM_THREADS=1
ENV OMP_NUM_THREADS=1
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
