FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --default-timeout=100 --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY pki/ /app/pki/

EXPOSE 8443 9443 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8443"]
