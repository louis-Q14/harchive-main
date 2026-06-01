@echo off
echo.
echo ===============================================
echo  HARCHIVE Backend - Demarrage propre
echo ===============================================

echo Arret des anciens processus node...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

cd /d "%~dp0backend"

echo Demarrage du backend sur port 3099...
echo.
node src/server.js
pause
