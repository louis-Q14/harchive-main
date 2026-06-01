#!/bin/bash
set -euo pipefail

DOMAIN="archive.cd"
APP_DIR="/var/www/harchive"
DB_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 64)
ADMIN_SEED=$(openssl rand -hex 16)
SUPERADMIN_SEED=$(openssl rand -hex 16)

# ── MySQL setup ──
mysql -e "CREATE DATABASE IF NOT EXISTS harchive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'harchive'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON harchive.* TO 'harchive'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "[OK] MySQL database + user created"

# ── Create directories ──
mkdir -p ${APP_DIR}/dist
mkdir -p ${APP_DIR}/backend
mkdir -p ${APP_DIR}/uploads
echo "[OK] Directories created"

# ── Nginx config ──
cat > /etc/nginx/sites-available/harchive << 'NGINX'
server {
    listen 80;
    server_name archive.cd www.archive.cd;

    root /var/www/harchive/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/harchive /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "[OK] Nginx configured"

# ── Backend .env ──
cat > ${APP_DIR}/backend/.env << EOF
PORT=3201
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${DOMAIN}
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=harchive
MYSQL_PASSWORD=${DB_PASS}
MYSQL_DATABASE=harchive
APP_ID=harchive-app
ADMIN_SEED_PASSWORD=${ADMIN_SEED}
SUPERADMIN_SEED_PASSWORD=${SUPERADMIN_SEED}
EOF
chmod 600 ${APP_DIR}/backend/.env
echo "[OK] Backend .env created"

# ── Firewall ──
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "[OK] Firewall configured"

echo ""
echo "=========================================="
echo "  SETUP COMPLETE"
echo "=========================================="
echo "  MySQL Password: ${DB_PASS}"
echo "  Admin Seed:     ${ADMIN_SEED}"
echo "  SuperAdmin Seed: ${SUPERADMIN_SEED}"
echo "=========================================="
