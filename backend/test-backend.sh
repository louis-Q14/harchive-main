#!/bin/bash

# HARCHIVE Backend Test Suite - Bash Script
# Usage: bash test-backend.sh

API_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Colors for Windows (PowerShell)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  RED=""
  GREEN=""
  YELLOW=""
  NC=""
fi

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║         HARCHIVE Backend Test Suite                        ║${NC}"
echo -e "${YELLOW}║         Testing: $API_URL                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1]${NC} Health Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Backend is running"
  echo "   Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
  echo "   Response: $BODY"
  exit 1
fi
echo ""

# Test 2: Get App Settings
echo -e "${YELLOW}[TEST 2]${NC} Get App Settings..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  "$API_URL/api/apps/public/prod/public-settings/by-id/harchive-app")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - App settings retrieved"
  echo "   Response: $BODY" | head -c 150
  echo ""
else
  echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: Signup
echo -e "${YELLOW}[TEST 3]${NC} Signup (Create User)..."
TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"testuser_$TIMESTAMP\",
    \"email\": \"test_$TIMESTAMP@example.com\",
    \"password\": \"password123\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  echo -e "${GREEN}✅ PASS${NC} - User created successfully"
  # Extract token from response
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:50}..."
  echo "   User ID: $USER_ID"
else
  echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
  echo "   Response: $BODY" | head -c 200
  echo ""
fi
echo ""

# Test 4: Login
echo -e "${YELLOW}[TEST 4]${NC} Login..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"testuser_$TIMESTAMP\",
    \"password\": \"password123\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Login successful"
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token generated"
else
  echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
  echo "   Response: $BODY"
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi
echo ""

# Test 5: Get Current User (requires auth)
echo -e "${YELLOW}[TEST 5]${NC} Get Current User (with auth)..."
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ SKIP${NC} - No token available"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/auth/me")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Current user retrieved"
    echo "   User info: $(echo $BODY | grep -o '"username":"[^"]*' | head -1)"
  else
    echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
  fi
fi
echo ""

# Test 6: Create Establishment
echo -e "${YELLOW}[TEST 6]${NC} Create Establishment (with auth)..."
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ SKIP${NC} - No token available"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/api/entities/Etablissement" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Lycée Test\",
      \"code\": \"LT-$TIMESTAMP\",
      \"address\": \"123 Rue Test\",
      \"city\": \"Kinshasa\"
    }")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Establishment created"
    EST_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "   ID: $EST_ID"
  else
    echo -e "${RED}❌ FAIL${NC} - HTTP $HTTP_CODE"
    echo "   Response: $BODY"
  fi
fi
echo ""

# Test 7: Get without Auth (should fail)
echo -e "${YELLOW}[TEST 7]${NC} Test Auth Protection (GET without token, should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$API_URL/api/entities/Etablissement/test-id")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Protected endpoint correctly returned 401"
else
  echo -e "${RED}⚠️  WARNING${NC} - Expected 401, got $HTTP_CODE"
fi
echo ""

# Summary
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                   Test Suite Completed                     ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
