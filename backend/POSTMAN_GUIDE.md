╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                  📮 POSTMAN GUI TESTING GUIDE 📮                         ║
║                                                                            ║
║              Complete Step-by-Step Instructions                          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝


============================== BEFORE YOU START ==============================

1️⃣  Backend must be RUNNING
    ↳ If not running, open Terminal and run:
       cd backend
       npm run dev
    
    Expected output:
       ✅ Backend initialized
       ✅ Server running on http://localhost:3000

2️⃣  Postman must be INSTALLED
    ↳ If not installed: https://www.postman.com/download/
    ↳ Create free account (optional but helpful)

3️⃣  Two files ready to import:
    ✅ HARCHIVE_Backend_Tests.postman_collection.json
    ✅ HARCHIVE_Backend_Environment.postman_environment.json


═══════════════════════════════════════════════════════════════════════════
📥 STEP 1: IMPORT COLLECTION
═══════════════════════════════════════════════════════════════════════════

1. Open Postman

2. Click "File" menu (top left)

3. Click "Import"

4. In dialog, select "File" tab (if not already selected)

5. Click "Upload Files" button

6. Navigate to backend folder:
   C:\Users\LOUIS-QUATORZE\Documents\harchive-main\backend\

7. Select: HARCHIVE_Backend_Tests.postman_collection.json

8. Click "Import"

✅ Result: You'll see a collection named "HARCHIVE Backend Tests" in left panel


═══════════════════════════════════════════════════════════════════════════
📥 STEP 2: IMPORT ENVIRONMENT
═══════════════════════════════════════════════════════════════════════════

1. Click "File" menu again

2. Click "Import" again

3. Select file tab

4. Click "Upload Files"

5. Navigate to backend folder again

6. Select: HARCHIVE_Backend_Environment.postman_environment.json

7. Click "Import"

✅ Result: Environment will be added to Postman


═══════════════════════════════════════════════════════════════════════════
⚙️  STEP 3: SELECT ENVIRONMENT
═══════════════════════════════════════════════════════════════════════════

1. Look at top-right of Postman

2. You'll see a dropdown that says "No Environment" (or similar)

3. Click that dropdown

4. Select "HARCHIVE Backend Environment"

✅ Result: All pre-configured variables are now active
   - base_url = http://localhost:3000
   - access_token = (will be filled on first login)
   - user_id, establishment_id, etc. (will be filled automatically)


═══════════════════════════════════════════════════════════════════════════
🧪 STEP 4: RUN TESTS
═══════════════════════════════════════════════════════════════════════════

LEFT SIDE: You'll see "HARCHIVE Backend Tests" collection

Expand it by clicking the arrow →

You'll see tests grouped by category:
  ├─ Health & Settings
  │  ├─ 1. Health Check
  │  └─ 2. Get App Settings
  │
  ├─ Authentication
  │  ├─ 3. Signup
  │  ├─ 4. Login
  │  ├─ 5. Get Profile
  │  └─ 6. Update Profile
  │
  └─ CRUD Operations
     ├─ 7. Create Establishment
     ├─ 8. Query All Entities
     ├─ 9. Get Entity by ID
     ├─ 10. Update Entity
     └─ 11. Delete Entity


OPTION A: RUN TESTS ONE BY ONE (Recommended for first time)
───────────────────────────────────────────────────────────

1. Click test name: "1. Health Check"

2. Click blue "Send" button (right side)

3. See response in lower panel

4. Response should show:
   Status: 200 OK
   Body: {"status": "ok"}

5. Continue with test 2, 3, 4, etc.

✅ Each test will use/save tokens automatically


OPTION B: RUN ALL TESTS AT ONCE (Collection Runner)
───────────────────────────────────────────────────

1. Find collection "HARCHIVE Backend Tests" on left

2. Click the "..." menu (three dots) next to it

3. Click "Run collection"

4. New window opens (Collection Runner)

5. Click blue "Run HARCHIVE Backend Tests" button

6. Watch all 11 tests run automatically

7. See results:
   - Test name
   - Status (PASS ✅ or FAIL ❌)
   - Time taken

✅ All tests run in sequence, passing tokens automatically


═══════════════════════════════════════════════════════════════════════════
✅ EXPECTED RESULTS
═══════════════════════════════════════════════════════════════════════════

TEST #  | NAME                  | STATUS | METHOD | ENDPOINT
--------|----------------------|--------|--------|---------------------------
1       | Health Check         | 200 OK | GET    | /health
2       | Get App Settings     | 200 OK | GET    | /api/apps/public/...
3       | Signup              | 201    | POST   | /api/auth/signup
4       | Login               | 200 OK | POST   | /api/auth/login
5       | Get Profile         | 200 OK | GET    | /api/auth/me
6       | Update Profile      | 200 OK | PUT    | /api/auth/me
7       | Create Entity       | 201    | POST   | /api/entities/...
8       | Query All           | 200 OK | POST   | /api/entities/.../query
9       | Get by ID           | 200 OK | GET    | /api/entities/.../:id
10      | Update Entity       | 200 OK | PUT    | /api/entities/.../:id
11      | Delete Entity       | 204    | DELETE | /api/entities/.../:id

All tests should show PASS ✅


═══════════════════════════════════════════════════════════════════════════
🔑 HOW AUTO TOKEN SAVING WORKS
═══════════════════════════════════════════════════════════════════════════

AUTOMATIC (No manual copy-paste needed!):

1. First run: Test #3 "Signup" creates new user
   → Response includes: "access_token": "jwt_token_xxx..."

2. Behind the scenes (Pre-request script):
   → Token is automatically extracted
   → Saved to environment variable: access_token

3. Next test automatically uses that token:
   → All subsequent tests send token in Authorization header
   → Authorization: Bearer {access_token}

4. Each test that modifies data (create, update, delete):
   → Automatically saves IDs to environment variables
   → establishment_id, user_id, student_id, etc.

5. Next test uses those saved IDs:
   → No manual ID copy-paste needed!

✅ This is why tests work perfectly in sequence!


═══════════════════════════════════════════════════════════════════════════
📝 VIEWING RESPONSE DATA
═══════════════════════════════════════════════════════════════════════════

After clicking "Send" on any test:

RESPONSE TABS (bottom right):
  ├─ Body          ← Most important (JSON response)
  ├─ Headers       ← Response headers
  ├─ Cookies       ← If any
  ├─ Test Results  ← Pass/Fail details
  └─ ...

BODY TAB (most useful):
  Shows formatted JSON response:

  {
    "status": "ok",
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      ...
    }
  }

FORMATTING OPTIONS:
  - JSON (default - best readability)
  - Raw (plain text)
  - Preview (HTML rendering)


═══════════════════════════════════════════════════════════════════════════
🔧 CUSTOMIZING REQUESTS
═══════════════════════════════════════════════════════════════════════════

Want to modify a request? Easy!

1. Click test name (e.g., "3. Signup")

2. Different tabs appear:
   - Params    ← URL parameters
   - Headers   ← Request headers
   - Body      ← Request body (JSON)
   - Pre-request Script  ← Runs before request
   - Tests     ← Test assertions

3. Edit and click "Send" again

4. Your changes apply only to this run (not saved)

EXAMPLE: Change email in Signup
  1. Click "3. Signup"
  2. Click "Body" tab
  3. Find: "email": "signup@example.com"
  4. Change to your email: "email": "test@myemail.com"
  5. Click "Send"
  6. New user created with your email!


═══════════════════════════════════════════════════════════════════════════
❌ TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════

PROBLEM: "Cannot connect to localhost:3000"
SOLUTION:
  1. Check backend is running
  2. Open Terminal
  3. Run: npm run dev (in backend folder)
  4. Wait for: "✅ Server running..."
  5. Try Postman test again

PROBLEM: "401 Unauthorized" on protected tests
SOLUTION:
  1. Make sure tests run in order
  2. First 3 tests (Health, Settings, Signup) must pass
  3. Signup saves the token
  4. Then protected tests use that token
  5. If token expired, run Signup again

PROBLEM: "Cannot GET /health"
SOLUTION:
  1. Check URL in request: http://localhost:3000
  2. Verify backend is actually running
  3. Restart backend if needed

PROBLEM: "Email already exists"
SOLUTION:
  1. Database still has old user
  2. Delete database: rm backend/data/harchive.db
  3. Restart backend
  4. Try Signup again (creates fresh database)

PROBLEM: Environment variables not appearing
SOLUTION:
  1. Make sure environment is selected (top-right dropdown)
  2. Click on environment dropdown
  3. Select "HARCHIVE Backend Environment"
  4. Variables should now appear

PROBLEM: "Token not saving between requests"
SOLUTION:
  1. Check environment is selected
  2. Run Signup test - watch for "access_token" in response
  3. Check environment variables in top-right
  4. Click on environment name to see all variables
  5. Should show: access_token = jwt_xxx...


═══════════════════════════════════════════════════════════════════════════
💡 PRO TIPS
═══════════════════════════════════════════════════════════════════════════

TIP 1: Run Collection Automatically
  - Use Collection Runner for hands-off testing
  - Great for verifying all tests pass
  - Shows summary at end

TIP 2: Monitor Environment Variables
  - Click environment name in top-right
  - See all stored variables
  - Useful for debugging
  - Edit variables manually if needed

TIP 3: Save API Calls for Later
  - Any request you modify becomes a favorite
  - Click star icon to save
  - Organize in folders
  - Share with team

TIP 4: Use Pre-request or Post-request Scripts
  - Modify requests dynamically
  - Already included in collection!
  - Check "Pre-request Script" tab to see how it works

TIP 5: Export Results
  - After running collection, can export results
  - Great for reports/documentation
  - Shows: Passed/Failed, time taken, status codes

TIP 6: Clone a Request
  - Right-click test name
  - Select "Duplicate"
  - Create custom test variations
  - Test edge cases

TIP 7: Compare Responses
  - Send same request twice
  - Compare Body tab responses
  - Useful for debugging data changes


═══════════════════════════════════════════════════════════════════════════
📚 NEXT STEPS AFTER TESTING
═══════════════════════════════════════════════════════════════════════════

Once all tests pass ✅:

1. ✅ Backend is working correctly
2. ✅ Authentication system functional
3. ✅ Database storing data
4. ✅ CRUD operations working

NEXT: Phase 3 - Migrate Frontend
  └─ Update 45+ pages to use local backend
  └─ Replace Base44 calls with backend API calls
  └─ Test each page with new backend
  └─ Switch VITE_USE_LOCAL_BACKEND=true


═══════════════════════════════════════════════════════════════════════════
🎉 YOU'RE READY!
═══════════════════════════════════════════════════════════════════════════

Summary:
  ✅ Backend running: npm run dev
  ✅ Postman installed
  ✅ Collection imported
  ✅ Environment selected
  ✅ Ready to test!

Click "Send" and watch the tests work! 🚀

═══════════════════════════════════════════════════════════════════════════
