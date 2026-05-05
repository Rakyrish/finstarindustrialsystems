# ──────────────────────────────────────────────────────────────────────────────
# FINSTAR Industrial Systems — Nginx Reverse Proxy
# ──────────────────────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for SSL certificates and cache
RUN mkdir -p /var/www/certbot /etc/letsencrypt /var/cache/nginx

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
