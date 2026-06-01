# 🧪 Backend Testing - Quick Reference

All files for testing HARCHIVE backend. Choose your method below!

---

## 📁 Test Files Created

| File | Method | Platform | Effort |
|------|--------|----------|--------|
| `HARCHIVE_Backend_Tests.postman_collection.json` | **Postman** | GUI | ⭐⭐ Easiest |
| `HARCHIVE_Backend_Environment.postman_environment.json` | Postman Env | GUI | ⭐ Auto-setup |
| `test-backend.ps1` | **PowerShell** | Windows | ⭐⭐⭐ Recommended |
| `test-backend.bat` | Batch | Windows | ⭐⭐ Quick |
| `test-backend.sh` | Bash | Linux/WSL | ⭐⭐ Quick |
| `TESTING_GUIDE.md` | Manual | All | ⭐⭐⭐⭐ Reference |

---

## 🚀 Quick Start (Choose One)

### Option 1: Postman (Easiest - GUI) ⭐⭐⭐

```
1. Download Postman: https://www.postman.com/download/
2. Open Postman
3. Click "Import" → Select "HARCHIVE_Backend_Tests.postman_collection.json"
4. Click "Import" again → Select "HARCHIVE_Backend_Environment.postman_environment.json"
5. Run each test from top to bottom
6. Tokens auto-save between requests!
```

**Pros:**
- ✅ Visual interface
- ✅ Auto-saves tokens
- ✅ Pretty formatting
- ✅ Easy to debug

---

### Option 2: PowerShell (Windows - Interactive) ⭐⭐⭐

**Open PowerShell and run:**

```powershell
cd backend
# Run all tests at once
.\test-backend.ps1

# Or run individual tests from the file
```

**Features:**
- ✅ Colored output
- ✅ Saves variables globally
- ✅ Test by test output
- ✅ Easy to modify

---

### Option 3: Batch Script (Windows - Quick) ⭐⭐

**Open Command Prompt and run:**

```batch
cd backend
test-backend.bat
```

**Output:**
- Quick tests
- Saves responses to files
- No color but works everywhere

---

### Option 4: Bash (Linux/WSL - Quick) ⭐⭐

**Open terminal and run:**

```bash
cd backend
bash test-backend.sh
```

**Output:**
- Colored output
- Tests run in order
- Good error messages

---

## 📋 What Gets Tested

✅ **Health Check** - Backend is running?
✅ **App Settings** - Configuration accessible?
✅ **User Signup** - Can create new accounts?
✅ **User Login** - Can authenticate?
✅ **Get Profile** - Can fetch user data?
✅ **Update Profile** - Can modify data?
✅ **Create Entity** - Can create establishments?
✅ **Query Entities** - Can list all establishments?
✅ **Get Entity** - Can fetch single establishment?
✅ **Update Entity** - Can modify establishment?
✅ **Delete Entity** - Can remove establishment?
✅ **Auth Protection** - Endpoints correctly protected?

---

## 💡 Step-by-Step for Beginners

### If you have NO experience with testing:

**Use Postman (Easiest)**

1. Download & install Postman
2. Open it
3. `File → Import → HARCHIVE_Backend_Tests.postman_collection.json`
4. Click the test names on the left
5. Click "Send" button
6. See responses on the right!

### If you're comfortable with command line:

**Use PowerShell / Bash**

```powershell
# PowerShell: Just run it!
.\test-backend.ps1

# Bash: Just run it!
bash test-backend.sh
```

---

## 🔍 Manual Testing Examples

### Test Health (No setup needed)
```bash
curl http://localhost:3000/health
```

### Test With Token (After login)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/auth/me
```

See `TESTING_GUIDE.md` for complete manual commands.

---

## ✅ Expected Results

All tests should show:
- ✅ Green checkmarks for passing tests
- ✅ Response data displayed
- ✅ Tokens saved automatically
- ✅ Entities created/updated/deleted successfully

---

## ❌ Troubleshooting

### "Cannot connect to backend"
```bash
# Make sure backend is running
cd backend
npm run dev
# Should say: "Server running on port 3000"
```

### "401 Unauthorized"
- Make sure you ran signup/login first
- Check token was saved
- Token expires after 24 hours

### "404 Not Found"
- Check entity ID is correct
- Entity might already be deleted

### Database errors
- Delete `backend/data/harchive.db`
- Restart backend
- Fresh database created automatically

---

## 📊 Files Summary

| File | Purpose |
|------|---------|
| `HARCHIVE_Backend_Tests.postman_collection.json` | Postman test collection with 11 tests |
| `HARCHIVE_Backend_Environment.postman_environment.json` | Postman environment variables (base_url, token, etc) |
| `test-backend.ps1` | PowerShell script - full test suite for Windows |
| `test-backend.bat` | Batch script - basic tests for Windows |
| `test-backend.sh` | Bash script - full test suite for Linux/Mac |
| `TESTING_GUIDE.md` | Complete manual testing guide with curl examples |
| `README.md` | Backend documentation |
| This file | Quick reference |

---

## 🎯 Next Steps After Testing

Once tests pass:

1. **Frontend Integration** - Connect frontend to backend
2. **Phase 3** - Migrate other endpoints
3. **Data Population** - Add real data
4. **Production** - Deploy to server

---

**That's it!** Pick a method and start testing! 🚀

For detailed info, see `TESTING_GUIDE.md`
