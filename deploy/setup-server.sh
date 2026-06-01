#!/bin/bash
# ============================================================
# HARCHIVE — Script d'installation serveur (Ubuntu 22.04)
# Usage: ssh root@IP "bash -s" < deploy/setup-server.sh
# ============================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

DOMAIN="archive.cd"
APP_DIR="/var/www/harchive"
DB_NAME="harchive"
DB_USER="harchive"
DB_PASS="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 64)"
ADMIN_SEED="$(openssl rand -hex 16)"
SUPERADMIN_SEED="$(openssl rand -hex 16)"

echo "=========================================="
echo "  HARCHIVE — Installation serveur"
echo "=========================================="

# ── 1. Mise à jour système ──
echo "[1/8] Mise à jour du système..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20 LTS ──
echo "[2/8] Installation Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# ── 3. Install MySQL ──
echo "[3/8] Installation MySQL..."
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# Créer la base et l'utilisateur
mysql -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# ── 4. Install Nginx ──
echo "[4/8] Installation Nginx..."
apt install -y nginx
systemctl enable nginx

# ── 5. Créer les dossiers ──
echo "[5/8] Création des dossiers..."
mkdir -p ${APP_DIR}/dist
mkdir -p ${APP_DIR}/backend
mkdir -p ${APP_DIR}/uploads

# ── 6. Configurer Nginx ──
echo "[6/8] Configuration Nginx..."
cat > /etc/nginx/sites-available/harchive << 'NGINX'
server {
    listen 80;
    server_name archive.cd www.archive.cd;

    # Frontend (fichiers statiques Vite)
    root /var/www/harchive/dist;
    index index.html;

    # API backend
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

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/harchive /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 7. Créer le .env backend ──
echo "[7/8] Configuration backend .env..."
cat > ${APP_DIR}/backend/.env << EOF
PORT=3201
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://${DOMAIN}
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=${DB_USER}
MYSQL_PASSWORD=${DB_PASS}
MYSQL_DATABASE=${DB_NAME}
APP_ID=harchive-app
ADMIN_SEED_PASSWORD=${ADMIN_SEED}
SUPERADMIN_SEED_PASSWORD=${SUPERADMIN_SEED}
EOF

chmod 600 ${APP_DIR}/backend/.env

# ── 8. Firewall ──
echo "[8/8] Configuration firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=========================================="
echo "  INSTALLATION TERMINÉE !"
echo "=========================================="
echo ""
echo "  MySQL DB:       ${DB_NAME}"
echo "  MySQL User:     ${DB_USER}"
echo "  MySQL Password: ${DB_PASS}"
echo ""
echo "  Backend .env:   ${APP_DIR}/backend/.env"
echo "  Frontend:       ${APP_DIR}/dist/"
echo ""
echo "  PROCHAINES ÉTAPES :"
echo "  1. Pointer le DNS de ${DOMAIN} vers cette IP"
echo "  2. Déployer le code (npm run deploy depuis ta machine)"
echo "  3. Installer SSL : sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "  IMPORTANT : Notez le mot de passe MySQL ci-dessus !"
echo "=========================================="
