# HARCHIVE Backend Test Suite - Final Version
# Tests automatiques du backend

$baseUrl = "http://localhost:3001"
$token = ""
$establishmentId = ""

Write-Host "`n" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "         TESTS BACKEND HARCHIVE - AUTOMATIQUES" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test 1: Health Check
Write-Host "[TEST 1/10] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Health check successful" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 2: App Settings
Write-Host "[TEST 2/10] Get App Settings..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/apps/public/prod/public-settings/by-id/harchive-app" -Method GET -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - App settings retrieved" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 3: Signup
Write-Host "[TEST 3/10] User Signup..." -ForegroundColor Yellow
try {
    $randomId = Get-Random
    $body = @{
        username = "testuser$randomId"
        email = "test$randomId@example.com"
        password = "TestPassword123"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/signup" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 201 -and $data.token) {
        $token = $data.token
        Write-Host "✅ PASS - User created" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 4: Get Profile
Write-Host "[TEST 4/10] Get User Profile..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Profile retrieved" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 5: Update Profile
Write-Host "[TEST 5/10] Update User Profile..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $body = @{
        email = "updated@example.com"
        firstName = "UpdatedFirst"
        lastName = "UpdatedLast"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method PUT -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Profile updated" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 6: Create Entity
Write-Host "[TEST 6/10] Create Establishment..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $body = @{
        name = "Test Establishment"
        email = "test-etab@example.com"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/entities/Etablissement" -Method POST -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 201 -and $data.data.id) {
        $establishmentId = $data.data.id
        Write-Host "✅ PASS - Establishment created" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 7: Query Entities
Write-Host "[TEST 7/10] Query Establishments..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $body = @{ filters = @() } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/entities/Etablissement/query" -Method POST -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Entities queried" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 8: Get Entity by ID
Write-Host "[TEST 8/10] Get Establishment by ID..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-WebRequest -Uri "$baseUrl/api/entities/Etablissement/$establishmentId" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Entity retrieved" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 9: Update Entity
Write-Host "[TEST 9/10] Update Establishment..." -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $body = @{
        name = "Updated Establishment"
        email = "updated-etab@example.com"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/entities/Etablissement/$establishmentId" -Method PUT -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS - Entity updated" -ForegroundColor Green
        $testsPassed++
    }
} catch {
    Write-Host "❌ FAIL - $_" -ForegroundColor Red
    $testsFailed++
}

# Test 10: Auth Protection
Write-Host "[TEST 10/10] Auth Protection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/me" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ FAIL - Should have been unauthorized" -ForegroundColor Red
    $testsFailed++
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS - Correctly blocked unauthorized" -ForegroundColor Green
        $testsPassed++
    }
}

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    RÉSULTATS FINAUX" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tests réussis:  $testsPassed/10" -ForegroundColor Green
Write-Host "❌ Tests échoués:   $testsFailed/10" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 TOUS LES TESTS PASSENT! 🎉" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Backend fonctionne parfaitement!" -ForegroundColor Green
    Write-Host "✅ Authentification OK" -ForegroundColor Green
    Write-Host "✅ CRUD operations OK" -ForegroundColor Green
    Write-Host "✅ Protection des routes OK" -ForegroundColor Green
} else {
    Write-Host "⚠️  Des tests ont échoué." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
