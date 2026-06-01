import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

import logger from '../utils/logger.js';
import { checkFile, recordViolation } from '../services/nsfwService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Allowed file types per category
const ALLOWED_TYPES = {
  profil: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  posts: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf'],
  galerie: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  livres: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  travaux: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
};

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB

/**
 * Build the user's folder path:
 * uploads/{role}/{etablissement_nom}/{user_id}/{category}/
 */
function getUserUploadPath(user, category) {
  const role = user.role_archive || user.role || 'utilisateur';
  const etabName = (user.etablissement_nom || 'sans_etablissement')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F ]/g, '')
    .replace(/\s+/g, '_');
  const userId = user.id;

  return path.join(UPLOADS_ROOT, role, etabName, userId, category);
}

/**
 * Ensure all standard subdirs exist for a user
 */
function ensureUserFolders(user) {
  const categories = ['profil', 'posts', 'galerie', 'documents', 'livres', 'travaux'];
  for (const cat of categories) {
    const dir = getUserUploadPath(user, cat);
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Configure multer storage dynamically
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category || 'documents';
    const dir = getUserUploadPath(req.user, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 50);
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e4);
    cb(null, `${safeName}_${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter — validate mime type per category
 */
const fileFilter = (req, file, cb) => {
  const category = req.params.category || 'documents';
  const allowed = ALLOWED_TYPES[category] || ALLOWED_TYPES.documents;

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé pour la catégorie "${category}". Types acceptés: ${allowed.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

/**
 * Generate a thumbnail image from the first page of a PDF using pdftoppm (poppler-utils).
const execAsync = promisify(exec);
async function generatePdfThumbnail(pdfPath, uploadsRoot) {
  const dir = path.dirname(pdfPath);
  const base = path.basename(pdfPath, path.extname(pdfPath));
  const outPrefix = path.join(dir, `${base}_thumb`);

  // pdftoppm: convert first page (-f 1 -l 1) to JPEG, scale to 400px wide
  await execAsync(
    `pdftoppm -f 1 -l 1 -jpeg -scale-to 400 "${pdfPath}" "${outPrefix}"`,
    { timeout: 30000 }
  );

  // pdftoppm appends a page number suffix: -1, -01, or -001
  const candidates = [
    `${outPrefix}-1.jpg`,
    `${outPrefix}-01.jpg`,
    `${outPrefix}-001.jpg`,
    `${outPrefix}-0001.jpg`,
  ];
  const thumbFile = candidates.find(f => fs.existsSync(f));
  if (!thumbFile) {nc(f));
  if (!thumbFile) {
    const files = fs.readdirSync(dir).filter(f => f.startsWith(`${base}_thumb-`) && f.endsWith('.jpg'));
    if (files.length > 0) {
      const found = path.join(dir, files[0]);
      const relPath = path.relative(uploadsRoot, found).replace(/\\/g, '/');
      return `/api/uploads/${relPath}`;
    }
    throw new Error('Thumbnail file not created');
  }

  const relPath = path.relative(uploadsRoot, thumbFile).replace(/\\/g, '/');
  return `/api/uploads/${relPath}`;
}

/**
 * POST /api/upload/:category
 * Upload a single file to user's folder
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Vérification NSFW sur les images et vidéos
    const nsfwResult = await checkFile(req.file.path, req.file.mimetype);
    if (nsfwResult.isNSFW) {
      // Supprimer le fichier bloqué
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

      // Enregistrer la violation et potentiellement bloquer le compte
      const { blocked, violationCount } = await recordViolation(
        req.user, req.file.originalname, nsfwResult.reason, req.params.category, nsfwResult.predictions
      );

      logger.warn(`[NSFW] Upload bloqué pour user ${req.user.id}: ${req.file.originalname} (violation ${violationCount}/3)`);
      return res.status(400).json({
        error: blocked
          ? `Votre compte a été bloqué automatiquement après ${violationCount} tentatives de publication de contenu inapproprié.`
          : `Ce fichier a été bloqué par notre système de modération automatique. Attention : ${violationCount}/3 avertissements.`,
        nsfw: true,
        reason: nsfwResult.reason,
        accountBlocked: blocked,
        violationCount
      });
    }

    // Build relative URL for serving
    const relativePath = path.relative(UPLOADS_ROOT, req.file.path).replace(/\\/g, '/');
    const fileUrl = `/api/uploads/${relativePath}`;

    // Auto-generate thumbnail from first page of PDF (for livres/travaux category)
    // Do it async — respond immediately, thumbnail generates in background
    let thumbnailUrl = null;
    const isPdfBook = (req.params.category === 'livres' || req.params.category === 'travaux') && req.file.mimetype === 'application/pdf';
    if (isPdfBook) {
      try {
        thumbnailUrl = await generatePdfThumbnail(req.file.path, UPLOADS_ROOT);
        logger.info(`[PDF] Thumbnail generated: ${thumbnailUrl}`);
      } catch (thumbErr) {
        logger.warn(`[PDF] Thumbnail generation failed: ${thumbErr.message}`);
      }
    }

    res.status(201).json({
      message: 'Fichier uploadé avec succès',
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: req.params.category,
        ...(thumbnailUrl && { thumbnailUrl })
      }
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
};

/**
 * POST /api/upload/:category/multiple
 * Upload multiple files (max 10)
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Vérification NSFW sur tous les fichiers
    const blockedFiles = [];
    const safeFiles = [];
    let accountBlocked = false;
    let lastViolationCount = 0;

    for (const file of req.files) {
      const nsfwResult = await checkFile(file.path, file.mimetype);
      if (nsfwResult.isNSFW) {
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
        blockedFiles.push({ name: file.originalname, reason: nsfwResult.reason });

        const { blocked, violationCount } = await recordViolation(
          req.user, file.originalname, nsfwResult.reason, req.params.category, nsfwResult.predictions
        );
        if (blocked) accountBlocked = true;
        lastViolationCount = violationCount;
        logger.warn(`[NSFW] Upload bloqué pour user ${req.user.id}: ${file.originalname} (violation ${violationCount}/3)`);
      } else {
        const relativePath = path.relative(UPLOADS_ROOT, file.path).replace(/\\/g, '/');
        safeFiles.push({
          url: `/api/uploads/${relativePath}`,
          name: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          category: req.params.category
        });
      }
    }

    if (blockedFiles.length > 0 && safeFiles.length === 0) {
      return res.status(400).json({
        error: accountBlocked
          ? `Votre compte a été bloqué automatiquement après ${lastViolationCount} tentatives de publication de contenu inapproprié.`
          : 'Tous les fichiers ont été bloqués par notre système de modération automatique.',
        nsfw: true,
        blockedFiles,
        accountBlocked,
        violationCount: lastViolationCount
      });
    }

    res.status(201).json({
      message: `${safeFiles.length} fichier(s) uploadé(s) avec succès`,
      files: safeFiles,
      ...(blockedFiles.length > 0 ? { blockedFiles, warning: `${blockedFiles.length} fichier(s) bloqué(s) par la modération` } : {})
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
};

/**
 * GET /api/upload/:category/list
 * List files in a user's category folder
 */
export const listFiles = async (req, res) => {
  try {
    const category = req.params.category;
    const dir = getUserUploadPath(req.user, category);

    if (!fs.existsSync(dir)) {
      return res.json({ files: [] });
    }

    const entries = fs.readdirSync(dir);
    const files = entries
      .filter(name => !name.startsWith('.'))
      .map(name => {
        const filePath = path.join(dir, name);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(UPLOADS_ROOT, filePath).replace(/\\/g, '/');
        return {
          name,
          url: `/api/uploads/${relativePath}`,
          size: stat.size,
          createdAt: stat.birthtime
        };
      });

    res.json({ files });
  } catch (error) {
    logger.error('List files error:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des fichiers' });
  }
};

/**
 * DELETE /api/upload/:category/:filename
 * Delete a specific file from user's folder
 */
export const deleteFile = async (req, res) => {
  try {
    const { category, filename } = req.params;

    // Sanitize filename to prevent path traversal
    const safeName = path.basename(filename);
    const dir = getUserUploadPath(req.user, category);
    const filePath = path.join(dir, safeName);

    // Verify the file is within the user's folder
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(dir);
    if (!resolvedPath.startsWith(resolvedDir)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    fs.unlinkSync(filePath);

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

/**
 * POST /api/upload/init-folders
 * Create the user's folder structure
 */
export const initUserFolders = async (req, res) => {
  try {
    ensureUserFolders(req.user);
    res.json({ message: 'Dossiers utilisateur initialisés avec succès' });
  } catch (error) {
    logger.error('Init folders error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'initialisation des dossiers' });
  }
};

export { UPLOADS_ROOT };
