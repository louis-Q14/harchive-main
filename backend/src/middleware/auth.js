import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
}

/**
 * Middleware to verify JWT token (checks HttpOnly cookie first, then Authorization header)
 */
export const verifyToken = (req, res, next) => {
  const token = req.cookies?.harchive_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'No token provided',
      extra_data: { reason: 'auth_required' }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token',
      extra_data: { reason: 'auth_required' }
    });
  }
};

/**
 * Generate short-lived access token (15 minutes)
 */
export const generateToken = (userId, userData = {}) => {
  return jwt.sign(
    {
      id: userId,
      ...userData
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

/**
 * Generate long-lived refresh token (7 days)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Cookie options for the access token (15 min)
 */
export const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 min in ms
  path: '/',
};

/**
 * Cookie options for the refresh token (7 days)
 */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth', // only sent to auth endpoints
};

/**
 * Set both auth cookies (access + refresh)
 */
export const setTokenCookie = (res, token, refreshToken) => {
  res.cookie('harchive_token', token, TOKEN_COOKIE_OPTIONS);
  if (refreshToken) {
    res.cookie('harchive_refresh', refreshToken, REFRESH_COOKIE_OPTIONS);
  }
};

/**
 * Clear all auth cookies
 */
export const clearTokenCookie = (res) => {
  res.clearCookie('harchive_token', { path: '/' });
  res.clearCookie('harchive_refresh', { path: '/api/auth' });
};

/**
 * Middleware to require specific roles
 * Usage: requireRole('admin_systeme', 'super_admin', 'admin_etablissement')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role_archive || req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: 403,
        message: 'Accès refusé. Permissions insuffisantes.'
      });
    }
    next();
  };
};

export default { verifyToken, generateToken, requireRole };
