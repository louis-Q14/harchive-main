# HARCHIVE Backend - Phase 2 (Mock Implementation)

Welcome to the **Phase 2** of the HARCHIVE migration away from Base44!

This directory contains a complete Node.js Express backend that replicates Base44's functionality for local development and testing.

## 🎯 Purpose

- **Independence from Base44**: No longer dependent on proprietary Base44 SDK
- **Full Control**: You own all the code, database, and configuration
- **Progressive Migration**: Easy transition path from Base44 to production backend
- **Local Development**: Fast development cycle without external API dependencies

## 📦 What's Included

### Backend Features
- ✅ **Authentication** - Login, signup, token management via JWT
- ✅ **App Settings** - Public configuration endpoint
- ✅ **Generic Data API** - CRUD operations for all entities
- ✅ **SQLite Database** - Local persistent storage
- ✅ **CORS Support** - Communication with frontend
- ✅ **Error Handling** - Consistent error responses

### Database Schema
- `users` - User accounts and profiles
- `establishments` - Schools/institutions
- `classes` - Academic classes
- `matieres` - Subjects/courses
- `students` - Student profiles
- `inscription_requests` - Registration requests

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Start Backend Server

```bash
npm run dev
```

Backend will start on **http://localhost:3000**

### 3. Configure Frontend to Use Local Backend

Edit your `.env.local` or `.env` file:

```env
VITE_USE_LOCAL_BACKEND=true
```

### 4. Start Frontend

```bash
cd ..
npm run dev
```

Frontend will use the local backend instead of Base44!

## 🔄 Running Both Together

From the root directory:

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
npm run dev:backend
```

Or use concurrent runner:
```bash
# (if you have concurrently installed)
npm run dev:all
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/me` - Update user profile (protected)

### App Settings
- `GET /api/apps/public/prod/public-settings/by-id/:appId` - Get app configuration

### Data Operations
- `POST /api/entities/:entityName/query` - Query entities (protected)
- `GET /api/entities/:entityName/:entityId` - Get single entity (protected)
- `POST /api/entities/:entityName` - Create entity (protected)
- `PUT /api/entities/:entityName/:entityId` - Update entity (protected)
- `DELETE /api/entities/:entityName/:entityId` - Delete entity (protected)

## 🔐 Authentication

The backend uses **JWT tokens** for authentication:

1. User logs in via `/api/auth/login` → receives JWT token
2. Token stored in `localStorage['base44_access_token']`
3. Token included in `Authorization: Bearer <token>` header
4. Protected endpoints verify token before allowing access

## 💾 Database

Backend uses **SQLite** for simplicity:

- Database file: `./data/harchive.db`
- Auto-created on first run
- Schema initialized in `src/db/database.js`

To reset database:
1. Delete `./data/harchive.db`
2. Restart backend

## 🛠️ Configuration

Edit `backend/.env`:

```env
PORT=3000                              # Backend port
NODE_ENV=development                   # Environment
JWT_SECRET=your_jwt_secret_here        # JWT signing key (change in production!)
DATABASE_PATH=./data/harchive.db       # Database location
CORS_ORIGIN=http://localhost:5174      # Frontend URL
APP_ID=harchive-app                    # App identifier
```

## 📝 Architecture

```
backend/
├── src/
│   ├── controllers/      # Business logic
│   │   ├── authController.js
│   │   ├── appSettingsController.js
│   │   └── dataController.js
│   ├── routes/           # API endpoints
│   │   ├── authRoutes.js
│   │   ├── appRoutes.js
│   │   └── dataRoutes.js
│   ├── middleware/       # Express middleware
│   │   └── auth.js       # JWT verification
│   ├── db/               # Database
│   │   └── database.js   # SQLite connection & schema
│   └── server.js         # Express app entry point
├── package.json
└── .env                  # Configuration
```

## 🔄 How It Works

### Frontend Integration

The frontend abstracts all API calls through service layers:

- `authService.js` - Authentication (supports both Base44 + local backend)
- `appSettingsService.js` - App configuration
- `dataService.js` - Entity CRUD operations (currently Base44 only)

When `VITE_USE_LOCAL_BACKEND=true`:
- All auth requests go to local backend
- App settings fetched from local backend
- No Base44 SDK calls needed

### Data Flow

```
User Opens App
    ↓
AuthContext checks auth with authService
    ↓
authService.getCurrentUser()
    ├─ If VITE_USE_LOCAL_BACKEND=true → calls backend
    └─ If false → calls Base44 SDK
    ↓
App renders with authenticated session
```

## 🧪 Testing Locally

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"password123"}'
```

### Test Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token_from_login>"
```

### Test App Settings
```bash
curl http://localhost:3000/api/apps/public/prod/public-settings/by-id/harchive-app
```

## 🚀 Next Steps

### Phase 3: Migrate All Data
- Replace Base44 entity calls with local backend
- Implement same API contract in backend
- Test all 45+ pages with local backend

### Phase 4: Production Backend
- Migrate from SQLite to PostgreSQL
- Add production database migrations
- Deploy backend to server
- Update frontend configuration

### Phase 5: Real Authentication
- Implement OAuth2 or custom JWT system
- Add password hashing (bcrypt or argon2)
- Add refresh token mechanism
- Add two-factor authentication (optional)

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/)
- [JWT Guide](https://jwt.io/)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## ⚠️ Important Notes

**Current Limitations:**
- Passwords stored in plain text (demo only!)
- No password reset functionality
- No email verification
- Date/file uploads not implemented
- Admin functions not migrated yet

**Before Production:**
- Implement proper password hashing (bcrypt/argon2)
- Add database migrations system
- Implement proper error logging
- Add input validation/sanitization
- Add rate limiting
- Add database backups
- Deploy to secure server with HTTPS

## 💡 Tips

1. **Check Backend Logs** - Backend logs all requests to stderr (terminal)
2. **API is RESTful** - Standard HTTP verbs: GET, POST, PUT, DELETE
3. **Errors Normalized** - All responses follow same error format
4. **Token Expires in** - JWT tokens expire after 24 hours (set in `middleware/auth.js`)

## 🆘 Troubleshooting

**Backend won't start**
- Check if port 3000 is already in use
- Verify Node.js version: `node --version` (need v16+)
- Check `.env` file exists and is readable

**Connection refused errors**
- Ensure both frontend and backend are running
- Check CORS_ORIGIN in `.env` matches frontend URL
- Verify firewall isn't blocking localhost connections

**Database locked**
- Kill any other processes using the database
- Delete `data/harchive.db` and restart backend

---

**Happy coding!** 🚀 

For questions or issues, check the main HARCHIVE documentation.
