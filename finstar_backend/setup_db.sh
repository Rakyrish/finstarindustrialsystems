#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# FINSTAR Backend — Database Setup Script
#
# Run this script with sudo permissions to create the PostgreSQL database:
#   sudo bash setup_db.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

DB_NAME="${DB_NAME:-finstar_db}"
DB_USER="${DB_USER:-finstar_user}"
DB_PASS="${DB_PASS:-finstar_pass}"

echo "🔧 Setting up FINSTAR database..."
echo "   Database: $DB_NAME"
echo "   User:     $DB_USER"
echo ""

# Create user (ignore error if already exists)
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || echo "   User $DB_USER already exists."

# Create database (ignore error if already exists)
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "   Database $DB_NAME already exists."

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Activate venv:    source venv/bin/activate"
echo "  2. Run migrations:   python manage.py migrate"
echo "  3. Seed data:        python manage.py seed_data"
echo "  4. Create admin:     python manage.py createsuperuser"
echo "  5. Run server:       python manage.py runserver"
