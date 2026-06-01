import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { dbUtils } from '../db/database.js';
import logger from '../utils/logger.js';

import {
  upload,
  uploadFile,
  uploadMultipleFiles,
  listFiles,
  deleteFile,
  initUserFolders
} from '../controllers/uploadController.js';

const router = express.Router();

// Middleware to enrich req.user with full DB data (needed for folder paths)
const enrichUser = async (req, res, next) => {
  try {
    const fullUser = await dbUtils.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (fullUser) {
      req.user = { ...req.user, ...fullUser };
      delete req.user.password_hash;
      delete req.user.password;
    }
    next();
  } catch (err) {
    logger.error('enrichUser error:', err);
    next();
  }
};

// Initialize user's folder structure
router.post('/upload/init-folders', verifyToken, enrichUser, initUserFolders);

// Upload single file to category
router.post('/upload/:category', verifyToken, enrichUser, upload.single('file'), uploadFile);

// Upload multiple files to category (max 10)
router.post('/upload/:category/multiple', verifyToken, enrichUser, upload.array('files', 10), uploadMultipleFiles);

// List files in category
router.get('/upload/:category/list', verifyToken, enrichUser, listFiles);

// Delete file from category
router.delete('/upload/:category/:filename', verifyToken, enrichUser, deleteFile);

// Error handler for multer errors
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Le fichier dépasse la taille maximale de 10 Mo' });
  }
  if (err.message && err.message.includes('Type de fichier')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
