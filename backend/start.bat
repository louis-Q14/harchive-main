@echo off
REM Launch HARCHIVE Backend
REM Navigate to backend directory and start server

cd /d "%~dp0"
echo Starting HARCHIVE Backend...
echo Current directory: %cd%
echo.

node src/server.js
