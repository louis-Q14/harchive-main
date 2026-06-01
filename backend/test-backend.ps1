# HARCHIVE Backend Testing - PowerShell Examples
# Copy and paste these commands into PowerShell to test the backend

# Make sure backend is running first!
# cd backend ; npm run dev

$APIUrl = "http://localhost:3000"

Write-Host "
╔════════════════════════════════════════════════╗
║     HARCHIVE Backend - PowerShell Tests        ║
║     API: $APIUrl                 ║
╚════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# ============================================================================
# TEST 1: Health Check (No Auth Required)
# ============================================================================
Write-Host "`n[TEST 1] Health Check..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$APIUrl/health" -ErrorAction Stop
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# TEST 2: Get App Settings (No Auth Required)
# ============================================================================
Write-Host "`n[TEST 2] Get App Settings..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$APIUrl/api/apps/public/prod/public-settings/by-id/harchive-app"
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ App settings retrieved" -ForegroundColor Green
    Write-Host "App Name: HARCHIVE"
    Write-Host "Settings: $($data.public_settings | ConvertTo-Json)"
} catch {
    Write-Host "❌ Failed to get settings" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

# ============================================================================
# TEST 3: Signup (Create User) - No Auth Required
# ============================================================================
Write-Host "`n[TEST 3] Signup (Create User)..." -ForegroundColor Yellow

$timestamp = Get-Date -UFormat %s
$signupBody = @{
    username = "testuser_$timestamp"
    email = "test_$timestamp@example.com"
    password = "password123"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$APIUrl/api/auth/signup" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $signupBody
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ User created successfully!" -ForegroundColor Green
    
    # Save token and user ID for later tests
    $global:Token = $data.token
    $global:UserId = $data.data.id
    
    Write-Host "User ID: $($data.data.id)"
    Write-Host "Username: $($data.data.username)"
    Write-Host "Token saved for next tests"
} catch {
    Write-Host "⚠️  Signup failed" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)"
    # Try to get error details
    try { Write-Host "Response: $($_.Exception.Response.Content.ReadAsStringAsync().Result)" } catch {}
}

# ============================================================================
# TEST 4: Login - No Auth Required
# ============================================================================
Write-Host "`n[TEST 4] Login..." -ForegroundColor Yellow

$loginBody = @{
    username = "testuser_$timestamp"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$APIUrl/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginBody
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Login successful!" -ForegroundColor Green
    
    # Save token
    $global:Token = $data.token
    Write-Host "Token: $($data.token.Substring(0, 50))..."
    Write-Host "User role: $($data.data.role)"
} catch {
    Write-Host "❌ Login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

# ============================================================================
# TEST 5: Get Current User - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 5] Get Current User (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token) {
    Write-Host "⚠️  Skipped - No token available" -ForegroundColor Yellow
    Write-Host "Run Signup or Login test first to get a token"
} else {
    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/auth/me" `
            -Headers @{"Authorization"="Bearer $($global:Token)"}
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Current user retrieved" -ForegroundColor Green
        Write-Host "Logged in as: $($data.data.username)"
        Write-Host "Email: $($data.data.email)"
        Write-Host "Role: $($data.data.role)"
    } catch {
        Write-Host "❌ Failed to get current user" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 6: Update User Profile - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 6] Update User Profile (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token) {
    Write-Host "⚠️  Skipped - No token available" -ForegroundColor Yellow
} else {
    $updateBody = @{
        firstName = "Updated"
        lastName = "Name"
        email = "updated_$timestamp@example.com"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/auth/me" `
            -Method PUT `
            -Headers @{"Authorization"="Bearer $($global:Token)"; "Content-Type"="application/json"} `
            -Body $updateBody
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Profile updated successfully!" -ForegroundColor Green
        Write-Host "New name: $($data.data.firstName) $($data.data.lastName)"
    } catch {
        Write-Host "❌ Failed to update profile" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 7: Create Establishment - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 7] Create Establishment (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token) {
    Write-Host "⚠️  Skipped - No token available" -ForegroundColor Yellow
} else {
    $createBody = @{
        name = "Lycée Test"
        code = "LT-$timestamp"
        address = "123 Rue de l'École"
        city = "Kinshasa"
        country = "RDC"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement" `
            -Method POST `
            -Headers @{"Authorization"="Bearer $($global:Token)"; "Content-Type"="application/json"} `
            -Body $createBody
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Establishment created!" -ForegroundColor Green
        $global:EstablishmentId = $data.data.id
        Write-Host "ID: $($data.data.id)"
        Write-Host "Name: $($data.data.name)"
    } catch {
        Write-Host "❌ Failed to create establishment" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 8: Get Establishment - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 8] Get Establishment (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token -or -not $global:EstablishmentId) {
    Write-Host "⚠️  Skipped - No token or establishment ID" -ForegroundColor Yellow
} else {
    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement/$($global:EstablishmentId)" `
            -Headers @{"Authorization"="Bearer $($global:Token)"}
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Establishment retrieved" -ForegroundColor Green
        $data.data | Format-Table -AutoSize
    } catch {
        Write-Host "❌ Failed to get establishment" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 9: Query All Establishments - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 9] Query All Establishments (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token) {
    Write-Host "⚠️  Skipped - No token available" -ForegroundColor Yellow
} else {
    $queryBody = @{filters = @()} | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement/query" `
            -Method POST `
            -Headers @{"Authorization"="Bearer $($global:Token)"; "Content-Type"="application/json"} `
            -Body $queryBody
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Establishments retrieved" -ForegroundColor Green
        Write-Host "Total: $($data.data.Count)"
        if ($data.data.Count -gt 0) {
            Write-Host "First establishment: $($data.data[0].name)"
        }
    } catch {
        Write-Host "❌ Failed to query establishments" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 10: Update Establishment - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 10] Update Establishment (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token -or -not $global:EstablishmentId) {
    Write-Host "⚠️  Skipped - No token or establishment ID" -ForegroundColor Yellow
} else {
    $updateBody = @{
        name = "Lycée Test Updated"
        city = "Kinshasa Updated"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement/$($global:EstablishmentId)" `
            -Method PUT `
            -Headers @{"Authorization"="Bearer $($global:Token)"; "Content-Type"="application/json"} `
            -Body $updateBody
        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Establishment updated!" -ForegroundColor Green
        Write-Host "New name: $($data.data.name)"
    } catch {
        Write-Host "❌ Failed to update establishment" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 11: Delete Establishment - AUTH REQUIRED
# ============================================================================
Write-Host "`n[TEST 11] Delete Establishment (Auth Required)..." -ForegroundColor Yellow

if (-not $global:Token -or -not $global:EstablishmentId) {
    Write-Host "⚠️  Skipped - No token or establishment ID" -ForegroundColor Yellow
} else {
    try {
        $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement/$($global:EstablishmentId)" `
            -Method DELETE `
            -Headers @{"Authorization"="Bearer $($global:Token)"}
        Write-Host "✅ Establishment deleted!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to delete establishment" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
    }
}

# ============================================================================
# TEST 12: Test Auth Protection (should fail)
# ============================================================================
Write-Host "`n[TEST 12] Test Auth Protection (No Token - Should Fail)..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$APIUrl/api/entities/Etablissement/test-id" -ErrorAction Stop
    Write-Host "⚠️  Auth check failed - endpoint accessible without token!" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq "Unauthorized") {
        Write-Host "✅ Auth protection working correctly (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "
╔════════════════════════════════════════════════╗
║           Test Suite Completed! 🎉             ║
╚════════════════════════════════════════════════╝

Variables saved in this session:
" -ForegroundColor Cyan

Write-Host "  `$global:Token = $([string]$global:Token.Substring(0, 30))..." -ForegroundColor Gray
Write-Host "  `$global:UserId = $($global:UserId)" -ForegroundColor Gray
Write-Host "  `$global:EstablishmentId = $($global:EstablishmentId)" -ForegroundColor Gray

Write-Host "
Next steps:
1. Use \$global:Token in other PowerShell tests
2. Import Postman collection for GUI testing
3. Check TESTING_GUIDE.md for more details
" -ForegroundColor Cyan
