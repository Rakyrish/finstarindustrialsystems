#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# FINSTAR Industrial Systems — SSL Certificate Provisioning
#
# Run this script ONCE on first deployment to obtain Let's Encrypt certificates.
#
# Prerequisites:
#   1. DNS A records for finstarindustrials.com and www.finstarindustrials.com
#      must point to your server's IP address.
#   2. Ports 80 and 443 must be open in your firewall.
#   3. Docker and Docker Compose must be installed.
#
# Usage:
#   chmod +x init-ssl.sh
#   ./init-ssl.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="finstarindustrials.com"
EMAIL="${SSL_EMAIL:-admin@finstarindustrials.com}"
STAGING=${SSL_STAGING:-0}  # Set to 1 for testing (avoids rate limits)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[init-ssl]${NC} $1"; }
warn() { echo -e "${YELLOW}[init-ssl]${NC} $1"; }
error() { echo -e "${RED}[init-ssl]${NC} $1"; }

# ── Step 1: Use the HTTP-only nginx config ───────────────────────────────────
log "Step 1/5: Switching to HTTP-only nginx config for ACME challenge..."
cp nginx/nginx.init.conf nginx/nginx.active.conf

# ── Step 2: Start services with HTTP-only config ────────────────────────────
log "Step 2/5: Starting services..."
docker compose up -d --build nginx backend frontend db

log "Waiting for services to be ready..."
sleep 10

# ── Step 3: Obtain certificates ──────────────────────────────────────────────
log "Step 3/5: Requesting SSL certificates from Let's Encrypt..."

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
    STAGING_ARG="--staging"
    warn "Using Let's Encrypt STAGING environment (for testing)"
fi

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -ne 0 ]; then
    error "Certificate provisioning failed!"
    error "Make sure DNS records point to this server and ports 80/443 are open."
    exit 1
fi

log "Certificates obtained successfully!"

# ── Step 4: Switch to full SSL nginx config ──────────────────────────────────
log "Step 4/5: Switching to production SSL nginx config..."
cp nginx/nginx.conf nginx/nginx.active.conf

# ── Step 5: Restart nginx with SSL ──────────────────────────────────────────
log "Step 5/5: Restarting nginx with SSL..."
docker compose restart nginx

echo ""
log "══════════════════════════════════════════════════════════════════"
log "  SSL setup complete!"
log "  Your site is now available at: https://$DOMAIN"
log "══════════════════════════════════════════════════════════════════"
echo ""
log "Certificate auto-renewal is handled by the certbot service."
log "Certificates will be renewed automatically every 12 hours."
