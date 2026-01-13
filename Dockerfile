FROM node:18-slim AS frontend-builder

WORKDIR /app
COPY frontend/package*.json ./frontend/
COPY backend/ ./backend/
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pillow-heif
RUN apt-get update && apt-get install -y --no-install-recommends \
    libheif-dev \
    libde265-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend with built frontend static files
COPY --from=frontend-builder /app/backend/ ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi --bind 0.0.0.0:$PORT"]
