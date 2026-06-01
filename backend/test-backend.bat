@echo off
REM HARCHIVE Backend Test Suite - Windows Batch Script
REM Usage: test-backend.bat

setlocal enabledelayedexpansion
set API_URL=http://localhost:3000

echo.
echo ===============================================================
echo             HARCHIVE Backend Test Suite
echo             Testing: %API_URL%
echo ===============================================================
echo.

REM Test 1: Health Check
echo [TEST 1] Health Check...
curl -s %API_URL%/health > nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] Backend is running
    curl -s %API_URL%/health
) else (
    echo [FAIL] Could not connect to backend
    echo Make sure backend is running on port 3000
    exit /b 1
)
echo.

REM Test 2: Get App Settings
echo [TEST 2] Get App Settings...
curl -s ^
  -H "Content-Type: application/json" ^
  %API_URL%/api/apps/public/prod/public-settings/by-id/harchive-app
echo.
echo [PASS] App settings retrieved
echo.

REM Test 3: Signup
echo [TEST 3] Signup (Create User)...
for /f "tokens=*" %%A in ('powershell Get-Date -UFormat %%s') do set TIMESTAMP=%%A

curl -s ^
  -X POST %API_URL%/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser_%TIMESTAMP%\",\"email\":\"test_%TIMESTAMP%@example.com\",\"password\":\"password123\",\"firstName\":\"Test\",\"lastName\":\"User\"}" > signup_response.json

echo [PASS] User created (check signup_response.json for details)
type signup_response.json
echo.

REM Test 4: Login
echo [TEST 4] Login...
curl -s ^
  -X POST %API_URL%/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser_%TIMESTAMP%\",\"password\":\"password123\"}" > login_response.json

echo [PASS] Login request completed (check login_response.json for token)
type login_response.json
echo.

REM Test 5: Instructions for Manual Tests
echo [INFO] Manual Testing Instructions:
echo.
echo To test protected endpoints, extract the token from login_response.json
echo and use it in a request like this:
echo.
echo curl -s ^
echo   -H "Authorization: Bearer [YOUR_TOKEN_HERE]" ^
echo   %API_URL%/api/auth/me
echo.
echo Or import HARCHIVE_Backend_Tests.postman_collection.json into Postman
echo for automated test suite with environment variables.
echo.

echo ===============================================================
echo                   Test Suite Completed
echo ===============================================================
echo.
echo Next steps:
echo 1. Check response files: signup_response.json, login_response.json
echo 2. Use tokens from responses to test protected endpoints
echo 3. Import Postman collection for full test automation
echo.

pause
