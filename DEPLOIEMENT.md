# Déploiement HARCHIVE — Guide de production

## Architecture

```
Client (navigateur)
  │
  └─► Nginx (port 80/443)
        ├── /api/*    → proxy vers backend Node.js (port 3201)
        ├── /uploads/* → proxy vers backend Node.js (port 3201)
        └── /*        → fichiers statiques (dist/)
```

## 1. Build du frontend

```bash
npm install
npx vite build          # → produit le dossier dist/
```

## 2. Configuration backend

```bash
cd backend
cp .env.example .env
# Remplir TOUTES les variables (JWT_SECRET, MYSQL_PASSWORD, etc.)
# Mettre NODE_ENV=production
npm install --production
node src/server.js
```

Utiliser **pm2** pour la gestion de processus :
```bash
npm install -g pm2
pm2 start src/server.js --name harchive-api
pm2 save
pm2 startup
```

## 3. Configuration Nginx

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Redirection HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate     /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

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

    # Uploads (fichiers téléchargés)
    location /uploads/ {
        proxy_pass http://127.0.0.1:3201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback — toutes les routes frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. Certificat SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 5. MySQL en production

```sql
-- Créer un utilisateur dédié avec mot de passe fort
CREATE USER 'harchive'@'localhost' IDENTIFIED BY '<mot-de-passe-fort>';
GRANT ALL PRIVILEGES ON harchive.* TO 'harchive'@'localhost';
FLUSH PRIVILEGES;
```

## 6. Checklist pré-déploiement

- [ ] `NODE_ENV=production` dans backend/.env
- [ ] `JWT_SECRET` est une clé aléatoire de 64+ octets
- [ ] `MYSQL_PASSWORD` est un mot de passe fort (pas celui de dev)
- [ ] `CORS_ORIGIN` pointe vers le domaine de production
- [ ] `ADMIN_SEED_PASSWORD` et `SUPERADMIN_SEED_PASSWORD` sont renouvelés
- [ ] `npm audit` ne montre aucune vulnérabilité critique
- [ ] Le build frontend (`npx vite build`) se termine sans erreur
- [ ] Nginx est configuré avec HTTPS
- [ ] pm2 gère le processus backend
- [ ] Les uploads sont sur un volume persistant (pas effacé au redéploiement)
