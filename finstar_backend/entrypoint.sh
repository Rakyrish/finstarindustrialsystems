#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# FINSTAR Backend — Production Entrypoint
# Handles: DB readiness check → migrations → collectstatic → gunicorn
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors for log output ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[entrypoint]${NC} $1"; }
warn() { echo -e "${YELLOW}[entrypoint]${NC} $1"; }
error() { echo -e "${RED}[entrypoint]${NC} $1"; }

# ── Wait for PostgreSQL ──────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-finstar_user}"
DB_NAME="${DB_NAME:-finstar_db}"
MAX_RETRIES=30
RETRY_INTERVAL=2

log "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

retries=0
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -q; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        error "PostgreSQL not available after ${MAX_RETRIES} attempts. Exiting."
        exit 1
    fi
    warn "PostgreSQL not ready (attempt ${retries}/${MAX_RETRIES}). Retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

log "PostgreSQL is ready!"

# ── Run database migrations ──────────────────────────────────────────────────
log "Running database migrations..."
python manage.py migrate --noinput
log "Migrations complete."

# ── Collect static files ─────────────────────────────────────────────────────
log "Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || \
    python manage.py collectstatic --noinput
log "Static files collected."

# ── Calculate optimal gunicorn workers ───────────────────────────────────────
# Formula: (2 × CPU_CORES) + 1, capped at 9 for memory efficiency
CPU_CORES=$(python -c "import os; print(os.cpu_count() or 2)")
WORKERS=${GUNICORN_WORKERS:-$(python -c "print(min(2 * ${CPU_CORES} + 1, 9))")}
THREADS=${GUNICORN_THREADS:-2}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

log "Starting gunicorn with ${WORKERS} workers, ${THREADS} threads, ${TIMEOUT}s timeout..."

# ── Start gunicorn ───────────────────────────────────────────────────────────
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "$WORKERS" \
    --threads "$THREADS" \
    --timeout "$TIMEOUT" \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output
