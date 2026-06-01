import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase, dbUtils } from './db/database.js';
import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import liveRoutes from './routes/liveRoutes.js';
import shortsRoutes from './routes/shortsRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import { initLiveWebSocket } from './ws/liveWebSocket.js';
import { preloadModel as preloadNsfwModel } from './services/nsfwService.js';

import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.set('trust proxy', 1); // trust first proxy (nginx)
let PORT = parseInt(process.env.PORT) || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files
  contentSecurityPolicy: false, // CSP configured at reverse proxy level in production
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per IP per window
  message: { status: 429, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests/min per IP
  message: { status: 429, message: 'Trop de requêtes. Réessayez dans un instant.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically with auth check and inline disposition for PDFs
app.use('/api/uploads', (req, res, next) => {
  // Allow public access to post images/videos and profile photos (needed for journal avatars)
  const isPostMedia = /\/posts\/[^/]+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(req.path);
  const isProfilePhoto = /\/profil\/[^/]+\.(jpg|jpeg|png|gif|webp)$/i.test(req.path);
  const isLivreCover = /\/(livres|travaux)\/[^/]+\.(jpg|jpeg|png|gif|webp)$/i.test(req.path);

  if (!isPostMedia && !isProfilePhoto && !isLivreCover) {
    // Require valid JWT for all other uploads (documents, PDFs, etc.)
    const token = req.cookies?.harchive_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ status: 401, message: 'Authentication required' });
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ status: 401, message: 'Invalid token' });
    }
  }
  if (req.path.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Type', 'application/pdf');
  }
  // Allow browser fetch to read the body
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// Dedicated PDF streaming endpoint - uses POST to bypass download managers (IDM etc.)
app.post('/api/doc-stream', (req, res) => {
  const filePath = req.body?.path;
  if (!filePath || !filePath.startsWith('/api/uploads/') || !filePath.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  // Require auth
  const token = req.cookies?.harchive_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Auth required' });
  try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }

  // Convert /api/uploads/... to actual file path
  const relativePath = filePath.replace(/^\/api\/uploads\//, '');
  // Sanitize path to prevent directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(__dirname, '..', 'uploads', safePath);
  
  if (!absolutePath.startsWith(path.join(__dirname, '..', 'uploads'))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Use octet-stream to prevent download manager interception
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type', 'application/pdf');
  res.sendFile(absolutePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// API Routes
// ── Global blocked-user middleware (blocks all API except auth & moderation messaging) ──
app.use('/api', async (req, res, next) => {
  // Skip auth routes, public app settings, and moderation messaging (blocked users need these)
  const path = req.path;
  if (path.startsWith('/auth') || path.startsWith('/apps/public') || path.startsWith('/moderation/my-blocked-messages') || path.startsWith('/moderation/blocked-messages')) {
    return next();
  }
  // Only check authenticated requests
  const token = req.cookies?.harchive_token || req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    if (decoded?.id) {
      const user = await dbUtils.get('SELECT blocked FROM users WHERE id = ?', [decoded.id]);
      if (user?.blocked) {
        return res.status(403).json({ status: 403, blocked: true, message: 'Votre compte est suspendu.' });
      }
    }
  } catch { /* token invalid — let verifyToken handle it */ }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api', appRoutes);
app.use('/api', dataRoutes);
app.use('/api', uploadRoutes);
app.use('/api/social', socialRoutes);
app.use('/api', aiRoutes);
app.use('/api', liveRoutes);
app.use('/api', shortsRoutes);
app.use('/api', moderationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.type === 'entity.too.large'
    ? 'Le fichier est trop volumineux. Taille maximale : 50 Mo.'
    : err.message || 'Internal server error';
  res.status(status).json({
    status,
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Try to start server on port, increment if in use
 */
const startServer = async (port, maxAttempts = 10) => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start server
    const server = app.listen(port, () => {
      // Initialize WebSocket for live streaming
      initLiveWebSocket(server);

      // Pré-charger le modèle NSFW (en arrière-plan)
      preloadNsfwModel();

      logger.info(`
╱╱╱╱╱╱╭━━━━┫ HARCHIVE Backend ┣━━━━╮╱╱╱╱╱╱
╱╱╱╱╱╱┃  Mock Backend Running  ┃╱╱╱╱╱╱
╱╱╱╱╱╱╰━━━━┫ Port: ${port} ┣━━━━╯╱╱╱╱╱╱

✅ Server running on http://localhost:${port}
📦 Database initialized
🔴 Live WebSocket on ws://localhost:${port}/ws/live
🔌 CORS enabled for ${process.env.CORS_ORIGIN || 'http://localhost:5173'}

📚 Available routes:
  POST   /api/auth/signup
  POST   /api/auth/login
  GET    /api/auth/me (protected)
  PUT    /api/auth/me (protected)
  GET    /api/apps/public/prod/public-settings/by-id/:appId
  POST   /api/entities/:entityName/query (protected)
  GET    /api/entities/:entityName/:entityId (protected)
  POST   /api/entities/:entityName (protected)
  PUT    /api/entities/:entityName/:entityId (protected)
  DELETE /api/entities/:entityName/:entityId (protected)
      `);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && maxAttempts > 1) {
        logger.warn(`⚠️  Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1, maxAttempts - 1);
      } else {
        logger.error('❌ Server error:', err.message);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(PORT);
