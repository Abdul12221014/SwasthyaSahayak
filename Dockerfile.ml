# Dockerfile for ML Inference Service

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML code
COPY src/ml /app/src/ml
COPY src/shared /app/src/shared

# Create model directory
RUN mkdir -p /models

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run inference service
CMD ["uvicorn", "src.ml.inference.service:app", "--host", "0.0.0.0", "--port", "8000"]

