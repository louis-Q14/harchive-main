# HARCHIVE Backend - Test Guide

Complete testing guide for the HARCHIVE backend. Choose your testing method below!

---

## 🚀 Quick Start

### 1. Make sure backend is running
```bash
cd backend
npm run dev
# Backend should start on http://localhost:3000
```

### 2. Choose your testing method

---

## 📊 Testing Methods

### Method 1: Postman (Recommended - Most User-Friendly)

**Setup:**
1. Download [Postman](https://www.postman.com/download/)
2. import `HARCHIVE_Backend_Tests.postman_collection.json` into Postman
3. Set `base_url` variable to `http://localhost:3000`
4. Run tests in order (they save tokens automatically)

**Advantages:**
- ✅ GUI interface
- ✅ Auto-saves tokens between requests
- ✅ Pre-built test suite
- ✅ Response formatting
- ✅ Collections history

---

### Method 2: PowerShell Scripts (Windows)

**Quick test (all tests at once):**
```powershell
.\test-backend.bat
```

**Manual tests with PowerShell:**

```powershell
# Health Check
$response = Invoke-WebRequest -Uri "http://localhost:3000/health"
$response.Content

# Get App Settings
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/apps/public/prod/public-settings/by-id/harchive-app"
$response.Content | ConvertFrom-Json | ConvertTo-Json

# Signup
$body = @{
    username = "testuser$(Get-Date -UFormat %s)"
    email = "test@example.com"
    password = "password123"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/signup" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body

$token = $response.Content | ConvertFrom-Json | Select-Object -ExpandProperty token
Write-Host "Token: $token"

# Get Current User (with token)
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" `
    -Headers @{"Authorization"="Bearer $token"}
$response.Content | ConvertFrom-Json
```

---

### Method 3: Bash/curl (Linux/Mac/WSL)

**Quick test (all tests at once):**
```bash
bash test-backend.sh
```

**Manual tests with curl:**

```bash
# Health Check
curl http://localhost:3000/health

# Get App Settings
curl http://localhost:3000/api/apps/public/prod/public-settings/by-id/harchive-app

# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Save token in variable
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' | jq -r '.token')

# Get Current User (with token)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me

# Update User Profile
curl -X PUT http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "User",
    "email": "updated@example.com"
  }'

# Create Establishment
curl -X POST http://localhost:3000/api/entities/Etablissement \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "code": "TS-'$(date +%s)'",
    "address": "123 Main St",
    "city": "Kinshasa"
  }'

# Query All Establishments
curl -X POST http://localhost:3000/api/entities/Etablissement/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filters": []}'

# Get Single Establishment (replace ID)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/entities/Etablissement/ESTABLISHMENT_ID_HERE

# Update Establishment
curl -X PUT http://localhost:3000/api/entities/Etablissement/ESTABLISHMENT_ID_HERE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated School Name",
    "city": "Updated City"
  }'

# Delete Establishment
curl -X DELETE http://localhost:3000/api/entities/Etablissement/ESTABLISHMENT_ID_HERE \
  -H "Authorization: Bearer $TOKEN"

# Test Auth Protection (no token - should fail)
curl http://localhost:3000/api/entities/Etablissement/test-id
# Should return 401 Unauthorized
```

---

## 📋 Complete API Endpoints Reference

### Authentication Endpoints (No Auth Required)

```
POST /api/auth/signup
  Body: { username, email, password, firstName?, lastName? }
  Response: { status, message, data: { id, username, email, ... }, token }
  HTTP: 201 Created / 409 Conflict (user exists)

POST /api/auth/login
  Body: { username, password }
  Response: { status, message, data: { id, username, ... }, token }
  HTTP: 200 OK / 401 Unauthorized

GET /api/apps/public/prod/public-settings/by-id/:appId
  Response: { id, public_settings: {...} }
  HTTP: 200 OK
```

### Authentication Endpoints (Auth Required)

```
GET /api/auth/me
  Headers: Authorization: Bearer <token>
  Response: { status, data: { id, username, email, ... } }
  HTTP: 200 OK / 401 Unauthorized

PUT /api/auth/me
  Headers: Authorization: Bearer <token>
  Body: { firstName, lastName, email }
  Response: { status, message, data: {...} }
  HTTP: 200 OK
```

### Data Endpoints (Auth Required)

```
POST /api/entities/:entityName/query
  Entity Names: User, Etablissement, Classe, Matiere, Etudiant, DemandeInscription
  Body: { filters: [...] }
  Response: { status, data: [...] }

POST /api/entities/:entityName
  Body: { name, code, ... } (entity-specific fields)
  Response: { status, message, data: {...} }
  HTTP: 201 Created

GET /api/entities/:entityName/:id
  Response: { status, data: {...} }
  HTTP: 200 OK / 404 Not Found

PUT /api/entities/:entityName/:id
  Body: { fields_to_update }
  Response: { status, message, data: {...} }

DELETE /api/entities/:entityName/:id
  Response: { status, message }
  HTTP: 200 OK / 404 Not Found
```

---

## 🧪 Test Scenarios

### Scenario 1: Complete User Journey

1. **Signup**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"username":"john_doe","email":"john@example.com","password":"secure123","firstName":"John","lastName":"Doe"}'
   ```
   Save the returned `token`

2. **Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"john_doe","password":"secure123"}'
   ```

3. **Get Profile**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/auth/me
   ```

4. **Update Profile**
   ```bash
   curl -X PUT http://localhost:3000/api/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Jonathan","email":"jonathan@example.com"}'
   ```

### Scenario 2: Create and Manage Establishment

1. **Create Establishment**
   ```bash
   curl -X POST http://localhost:3000/api/entities/Etablissement \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name":"Lycée Central Kinshasa",
       "code":"LCK-2024",
       "address":"456 Avenue K",
       "city":"Kinshasa",
       "country":"RDC"
     }'
   ```
   Save the returned `id`

2. **Get Establishment**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/entities/Etablissement/YOUR_ID
   ```

3. **Update Establishment**
   ```bash
   curl -X PUT http://localhost:3000/api/entities/Etablissement/YOUR_ID \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"city":"Kinshasa Updated"}'
   ```

4. **List All Establishments**
   ```bash
   curl -X POST http://localhost:3000/api/entities/Etablissement/query \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"filters":[]}'
   ```

5. **Delete Establishment**
   ```bash
   curl -X DELETE http://localhost:3000/api/entities/Etablissement/YOUR_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## ✅ Expected Test Results

### Successful Response (200/201)
```json
{
  "status": 200,
  "data": { ... }
}
```

### Auth Error (401)
```json
{
  "status": 401,
  "message": "No token provided",
  "extra_data": { "reason": "auth_required" }
}
```

### Not Found (404)
```json
{
  "status": 404,
  "message": "Entity not found"
}
```

### Validation Error (400)
```json
{
  "status": 400,
  "message": "Missing required fields",
  "error": "..."
}
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3000 is in use: `netstat -an | grep 3000`
- Kill existing process: `lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9`
- Verify Node.js installed: `node --version`

### "Cannot connect" error
- Make sure backend is running: `npm run dev` from `backend/` folder
- Check firewall isn't blocking localhost:3000
- Verify BASE_URL is correct: `http://localhost:3000`

### 401 Unauthorized on protected routes
- Make sure you include: `Authorization: Bearer <your_token>`
- Check token isn't expired (valid for 24 hours)
- Verify token was saved from signup/login response

### 404 on entity endpoints
- Verify entity name is correct (capitalized): Etablissement, Classe, etc.
- Check you're using correct entity ID from previous response
- Entity might not exist in database

### CORS errors
- Make sure frontend is on `http://localhost:5174+`
- Check backend `.env` has correct CORS_ORIGIN
- Add `-H "Content-Type: application/json"` to requests

---

## 📝 Notes

- **Tokens expire after 24 hours**
- **Passwords stored in plain text** (demo only - hash in production!)
- **Database is SQLite** in `data/harchive.db`
- **No rate limiting** - add in production
- **All timestamps use ISO 8601 format**

---

**Happy Testing!** 🚀
