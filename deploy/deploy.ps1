# ============================================================
# HARCHIVE - Script de deploiement (Windows PowerShell)
# Usage: .\deploy\deploy.ps1
# ============================================================
param(
    [string]$Server = "root@187.124.54.26",
    [string]$AppDir = "/var/www/harchive"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  HARCHIVE - Deploiement en production"     -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# -- 1. Build frontend --
Write-Host "`n[1/4] Build du frontend..." -ForegroundColor Yellow
npx vite build
if ($LASTEXITCODE -ne 0) { throw "Build frontend echoue" }

# -- 2. Upload frontend (dist/) --
Write-Host "`n[2/4] Upload du frontend..." -ForegroundColor Yellow
ssh $Server "rm -rf ${AppDir}/dist/assets/*"
scp -r dist/* "${Server}:${AppDir}/dist/"
if ($LASTEXITCODE -ne 0) { throw "Upload frontend echoue" }
ssh $Server "chmod -R 755 ${AppDir}/dist/"

# -- 3. Upload backend --
Write-Host "`n[3/4] Upload du backend..." -ForegroundColor Yellow
$backendFiles = @(
    "backend/src",
    "backend/package.json",
    "backend/package-lock.json"
)
foreach ($item in $backendFiles) {
    if (Test-Path $item) {
        scp -r $item "${Server}:${AppDir}/backend/"
        if ($LASTEXITCODE -ne 0) { throw "Upload de $item echoue" }
    }
}

# -- 4. Installer dependances + redemarrer --
Write-Host "`n[4/4] Installation + redemarrage sur le serveur..." -ForegroundColor Yellow
$remoteCmd = "chmod -R 755 ${AppDir}/dist/ && cd ${AppDir}/backend && npm install --production && (pm2 restart harchive-api 2>/dev/null || pm2 start src/server.js --name harchive-api) && pm2 save && echo 'Deploiement termine'"
ssh $Server $remoteCmd

if ($LASTEXITCODE -ne 0) { throw "Redemarrage serveur echoue" }

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Deploiement reussi !"                       -ForegroundColor Green
Write-Host "  https://archive.cd"                         -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
