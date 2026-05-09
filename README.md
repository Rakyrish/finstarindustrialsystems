# 🏭 FINSTAR Industrial Systems

> Production-grade web application for FINSTAR Industrial Systems — an industrial equipment supplier with AI-powered product management, chatbot support, and comprehensive admin dashboard.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (TypeScript, App Router, Tailwind CSS v4) |
| **Backend** | Django 5.2 (Django REST Framework, JWT Authentication) |
| **Database** | PostgreSQL 16 |
| **AI Services** | OpenAI (product content and chatbot) |
| **Image Storage** | Cloudinary |
| **Reverse Proxy** | Nginx (gzip, SSL, caching) |
| **SSL** | Let's Encrypt (auto-renewal via Certbot) |
| **Containerization** | Docker + Docker Compose |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet / Browser                    │
└────────────────────────┬────────────────────────────────┘
                         │ :80 / :443
                         ▼
              ┌─────────────────────┐
              │   Nginx (SSL/Proxy) │
              └──────┬────────┬─────┘
                     │        │
          /api/*     │        │  /*
                     ▼        ▼
         ┌──────────────┐  ┌──────────────┐
         │   Django     │  │   Next.js    │
         │  (gunicorn)  │  │  (standalone)│
         │   :8000      │  │    :3000     │
         └──────┬───────┘  └──────────────┘
                │
                ▼
         ┌──────────────┐     ┌──────────────┐
         │  PostgreSQL  │     │  Cloudinary  │
         │    :5432     │     │  (external)  │
         └──────────────┘     └──────────────┘
```

---

## 📋 Prerequisites

- **Docker** ≥ 24.0 — [Install Docker](https://docs.docker.com/engine/install/)
- **Docker Compose** ≥ 2.20 — [Install Docker Compose](https://docs.docker.com/compose/install/)
- A **VPS** with at least 2GB RAM and 20GB disk space
- A **domain name** with DNS A records pointing to your server IP

---

## ⚡ Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/finstarindustrialsystems.git
cd finstarindustrialsystems
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values (API keys, database credentials, etc.)
```

### 3. Start with Docker Compose (Development Mode)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

### 4. Create a superuser (first time only)

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. (Optional) Seed sample data

```bash
docker compose exec backend python manage.py seed_data
```

---

## 🚢 Production Deployment (VPS)

### Step 1: Server Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin
```

### Step 2: Clone & Configure

```bash
git clone https://github.com/your-org/finstarindustrialsystems.git
cd finstarindustrialsystems

cp .env.example .env
nano .env  # Fill in production values
```

> ⚠️ **Important**: Set a strong `SECRET_KEY`, `DB_PASSWORD`, and ensure `DEBUG=False`.

### Step 3: DNS Configuration

Create DNS A records pointing to your server IP:

| Type | Name | Value |
|------|------|-------|
| A | `finstarindustrials.com` | `YOUR_SERVER_IP` |
| A | `www.finstarindustrials.com` | `YOUR_SERVER_IP` |

Wait for DNS propagation (5–30 minutes).

### Step 4: SSL Certificate & Deploy

```bash
# Provision SSL certificates and start everything
chmod +x init-ssl.sh
./init-ssl.sh
```

This script will:
1. Start services with HTTP-only nginx config
2. Obtain Let's Encrypt SSL certificates
3. Switch to full HTTPS nginx config
4. Auto-renewal runs every 12 hours

### Step 5: Create Admin User

```bash
docker compose exec backend python manage.py createsuperuser
```

Admin URLs after deploy:
- Custom site admin app: `https://finstarindustrials.com/admin`
- Django admin: `https://finstarindustrials.com/root/admin/`

### Step 6: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Check service health
curl -k https://finstarindustrials.com/api/health

# Check logs
docker compose logs -f --tail=50
```

---

## 🔧 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key (generate a random 50-char string) | `your-random-secret` |
| `DEBUG` | Django debug mode (`True` for dev, `False` for prod) | `False` |
| `DB_NAME` | PostgreSQL database name | `finstar_db` |
| `DB_USER` | PostgreSQL username | `finstar_user` |
| `DB_PASSWORD` | PostgreSQL password | `strong-password-here` |
| `DB_HOST` | Database host (`db` for Docker, `localhost` for local) | `db` |
| `DB_PORT` | Database port | `5432` |
| `ALLOWED_HOSTS` | Django allowed hosts (comma-separated) | `finstarindustrials.com,www.finstarindustrials.com` |
| `CORS_ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://finstarindustrials.com` |
| `CSRF_TRUSTED_ORIGINS` | CSRF trusted origins (comma-separated) | `https://finstarindustrials.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL (baked into client bundle) | `https://finstarindustrials.com/` |
| `NEXT_PUBLIC_BASE_URL` | Public base URL | `https://finstarindustrials.com` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-secret` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `OPENAI_MODEL` | Primary chatbot model | `gpt-4.1-mini` |
| `OPENAI_FALLBACK_MODEL` | Chatbot fallback model | `gpt-4.1-nano` |
| `SSL_EMAIL` | Email for Let's Encrypt notifications | `admin@finstarindustrials.com` |
| `SSL_STAGING` | Set to `1` for Let's Encrypt staging (testing) | `0` |

---

## 📦 Docker Commands Reference

### Production

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f
docker compose logs -f backend    # Backend only
docker compose logs -f frontend   # Frontend only

# Stop services
docker compose down

# Restart a single service
docker compose restart backend

# Scale (if needed)
docker compose up -d --scale backend=3

# Run Django management commands
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py collectstatic --noinput

# Database backup
docker compose exec db pg_dump -U finstar_user finstar_db > backup_$(date +%Y%m%d).sql

# Database restore
cat backup.sql | docker compose exec -T db psql -U finstar_user finstar_db
```

### Development

```bash
# Start in development mode (hot-reload, direct port access)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Run tests
docker compose exec backend python manage.py test
```

---

## 🔒 Security Checklist

- [x] Secrets stored in `.env` (never committed)
- [x] Django `DEBUG=False` in production
- [x] HTTPS enforced via nginx redirect
- [x] HSTS headers enabled (63072000 seconds / 2 years)
- [x] Secure cookies (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`)
- [x] Rate limiting on API endpoints (30 req/s) and login (5 req/min)
- [x] Non-root Docker users for all services
- [x] Nginx security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- [x] SSL with TLS 1.2+ and OCSP stapling
- [x] Docker health checks for service monitoring

---

## 🔄 SSL Certificate Renewal

Certificates auto-renew via the Certbot container. To manually trigger renewal:

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

---

## 📁 Project Structure

```
finstarindustrialsystems/
├── app/                        # Next.js App Router pages
│   ├── admin/                  # Admin dashboard
│   ├── api/                    # API routes
│   ├── about/                  # About page
│   ├── contact/                # Contact page
│   ├── products/               # Products pages
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Homepage
├── components/                 # React components
├── lib/                        # Utilities & API client
├── types/                      # TypeScript types
├── public/                     # Static assets
├── finstar_backend/            # Django backend
│   ├── config/                 # Django settings & URLs
│   ├── products/               # Products app (models, views, AI)
│   ├── chatbot/                # Chatbot app (OpenAI sales assistant)
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend Docker image
│   └── entrypoint.sh           # Production entrypoint
├── nginx/                      # Nginx configuration
│   ├── Dockerfile              # Nginx Docker image
│   ├── nginx.conf              # Production config (SSL)
│   └── nginx.init.conf         # HTTP-only config (SSL provisioning)
├── Dockerfile                  # Frontend Docker image
├── docker-compose.yml          # Production orchestration
├── docker-compose.dev.yml      # Development override
├── init-ssl.sh                 # SSL provisioning script
├── .env.example                # Environment template
├── .dockerignore               # Frontend Docker build filter
├── .gitignore                  # Git ignore rules
├── package.json                # Node.js dependencies
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

---

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs for errors
docker compose logs backend
docker compose logs frontend

# Rebuild from scratch
docker compose down -v
docker compose up -d --build --force-recreate
```

### Database connection refused
```bash
# Ensure the db service is healthy
docker compose ps db

# Check if PostgreSQL is ready
docker compose exec db pg_isready -U finstar_user
```

### SSL certificate issues
```bash
# Test with staging first to avoid rate limits
SSL_STAGING=1 ./init-ssl.sh

# Check certificate status
docker compose run --rm certbot certificates
```

### Frontend build fails
```bash
# Check for TypeScript errors
docker compose exec frontend npx next build

# Clear build cache
docker compose down
docker volume rm finstarindustrialsystems_frontend-build 2>/dev/null
docker compose up -d --build frontend
```

---

## 📄 License

© 2024 FINSTAR Industrial Systems. All rights reserved.
