# ──────────────────────────────────────────────────────────────────────────────
# FINSTAR Industrial Systems — Backend (Django) Production Dockerfile
# Multi-stage build for minimal image size
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build dependencies ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

# Install system deps required to compile Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Production runner ───────────────────────────────────────────────
FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# Install only runtime system dependencies (no compiler)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN groupadd --gid 1001 django && \
    useradd --uid 1001 --gid django --shell /bin/bash --create-home django

# Copy application source
COPY --chown=django:django . .

# Create directories for static files and logs
RUN mkdir -p /app/staticfiles /app/logs && \
    chown -R django:django /app/staticfiles /app/logs

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

USER django

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
