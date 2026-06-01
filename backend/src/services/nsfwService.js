import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { dbUtils } from '../db/database.js';

const execAsync = promisify(exec);

// Seuils de détection
const THRESHOLDS = {
  porn: 0.60,      // Bloquer si > 60% pornographique
  hentai: 0.60,    // Bloquer si > 60% hentai
  sexy: 0.85,      // Seul le "très sexy" est bloqué
};

let model = null;
let modelLoading = false;

/**
 * Charge le modèle NSFWJS (une seule fois, mis en cache)
 */
async function loadModel() {
  if (model) return model;
  if (modelLoading) {
    // Attendre que le chargement en cours se termine
    while (modelLoading && !model) {
      await new Promise(r => setTimeout(r, 200));
    }
    return model;
  }

  modelLoading = true;
  try {
    logger.info('[NSFW] Chargement du modèle de détection...');
    model = await nsfwjs.load();
    logger.info('[NSFW] Modèle chargé avec succès');
    return model;
  } catch (err) {
    logger.error('[NSFW] Erreur chargement modèle:', err);
    modelLoading = false;
    throw err;
  }
}

/**
 * Convertit un buffer image en tensor 3D pour NSFWJS
 */
async function imageToTensor(imageBuffer) {
  // Redimensionner à 224x224 (taille attendue par le modèle) et convertir en RGB raw
  const { data, info } = await sharp(imageBuffer)
    .resize(224, 224, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Créer un tensor [224, 224, 3]
  return tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
}

/**
 * Analyse une image pour détecter du contenu NSFW
 * @param {string} filePath - Chemin vers le fichier image
 * @returns {{ isNSFW: boolean, reason: string|null, predictions: object[] }}
 */
export async function checkImage(filePath) {
  try {
    const m = await loadModel();
    const imageBuffer = fs.readFileSync(filePath);
    const imageTensor = await imageToTensor(imageBuffer);

    const predictions = await m.classify(imageTensor);
    imageTensor.dispose();

    const porn = predictions.find(p => p.className === 'Porn');
    const hentai = predictions.find(p => p.className === 'Hentai');
    const sexy = predictions.find(p => p.className === 'Sexy');

    let isNSFW = false;
    let reason = null;

    if (porn && porn.probability > THRESHOLDS.porn) {
      isNSFW = true;
      reason = 'Contenu pornographique détecté';
    } else if (hentai && hentai.probability > THRESHOLDS.hentai) {
      isNSFW = true;
      reason = 'Contenu pornographique (dessin) détecté';
    } else if (sexy && sexy.probability > THRESHOLDS.sexy) {
      isNSFW = true;
      reason = 'Contenu sexuellement explicite détecté';
    }

    if (isNSFW) {
      logger.warn(`[NSFW] BLOQUÉ: ${path.basename(filePath)} - ${reason} (Porn: ${(porn?.probability * 100).toFixed(1)}%, Hentai: ${(hentai?.probability * 100).toFixed(1)}%, Sexy: ${(sexy?.probability * 100).toFixed(1)}%)`);
    }

    return { isNSFW, reason, predictions };
  } catch (err) {
    logger.error('[NSFW] Erreur analyse image:', err);
    // En cas d'erreur d'analyse, on laisse passer (fail-open) pour ne pas bloquer les uploads légitimes
    return { isNSFW: false, reason: null, predictions: [] };
  }
}

/**
 * Analyse une vidéo en extrayant des frames et en les analysant
 * @param {string} filePath - Chemin vers le fichier vidéo
 * @returns {{ isNSFW: boolean, reason: string|null }}
 */
export async function checkVideo(filePath) {
  const tempDir = path.join(path.dirname(filePath), `.nsfw_check_${Date.now()}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Extraire 6 frames réparties dans la vidéo
    await execAsync(
      `ffmpeg -i "${filePath}" -vf "select=not(mod(n\\,30))" -frames:v 6 -vsync vfr "${path.join(tempDir, 'frame_%03d.jpg')}" -y -loglevel quiet`
    );

    const frames = fs.readdirSync(tempDir).filter(f => f.endsWith('.jpg'));

    if (frames.length === 0) {
      logger.warn('[NSFW] Aucune frame extraite de la vidéo, vérification ignorée');
      return { isNSFW: false, reason: null };
    }

    // Analyser chaque frame
    for (const frame of frames) {
      const framePath = path.join(tempDir, frame);
      const result = await checkImage(framePath);

      if (result.isNSFW) {
        logger.warn(`[NSFW] Vidéo BLOQUÉE: ${path.basename(filePath)} - frame ${frame} - ${result.reason}`);
        return { isNSFW: true, reason: result.reason };
      }
    }

    return { isNSFW: false, reason: null };
  } catch (err) {
    logger.error('[NSFW] Erreur analyse vidéo:', err);
    // Si ffmpeg n'est pas disponible ou erreur, on laisse passer
    return { isNSFW: false, reason: null };
  } finally {
    // Nettoyer les frames temporaires
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) { /* ignore cleanup errors */ }
  }
}

/**
 * Vérifie un fichier uploadé (image ou vidéo)
 * @param {string} filePath - Chemin vers le fichier
 * @param {string} mimetype - Type MIME du fichier
 * @returns {{ isNSFW: boolean, reason: string|null }}
 */
export async function checkFile(filePath, mimetype) {
  if (!filePath || !mimetype) return { isNSFW: false, reason: null };

  if (mimetype.startsWith('image/')) {
    return checkImage(filePath);
  }

  if (mimetype.startsWith('video/')) {
    return checkVideo(filePath);
  }

  // Documents (PDF, etc.) : pas de vérification NSFW
  return { isNSFW: false, reason: null };
}

/**
 * Pré-charger le modèle au démarrage du serveur
 */
export async function preloadModel() {
  try {
    await loadModel();
  } catch (err) {
    logger.error('[NSFW] Impossible de pré-charger le modèle:', err);
  }
}

const MAX_VIOLATIONS = 3;

/**
 * Enregistre une violation NSFW et bloque le compte si >= 3 violations
 * @param {object} user - L'utilisateur (id, nom, email, role_archive...)
 * @param {string} filename - Nom du fichier bloqué
 * @param {string} reason - Raison du blocage
 * @param {string} category - Catégorie d'upload
 * @param {object[]} predictions - Scores du modèle
 * @returns {{ blocked: boolean, violationCount: number }}
 */
export async function recordViolation(user, filename, reason, category, predictions) {
  try {
    const userNom = [user.prenom, user.nom, user.post_nom].filter(Boolean).join(' ') || user.email;

    // Enregistrer la violation
    await dbUtils.run(
      `INSERT INTO nsfw_violations (id, user_id, user_nom, user_email, filename, reason, category, scores)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), user.id, userNom, user.email || '', filename, reason, category || '',
       JSON.stringify(predictions?.map(p => ({ class: p.className, prob: Math.round(p.probability * 100) })) || [])]
    );

    // Compter les violations
    const countRow = await dbUtils.get(
      'SELECT COUNT(*) as cnt FROM nsfw_violations WHERE user_id = ?',
      [user.id]
    );
    const violationCount = countRow?.cnt || 1;

    logger.warn(`[NSFW] Violation ${violationCount}/${MAX_VIOLATIONS} pour ${userNom} (${user.id})`);

    // Auto-blocage après 3 violations
    if (violationCount >= MAX_VIOLATIONS) {
      // Bloquer le compte
      await dbUtils.run('UPDATE users SET blocked = 1 WHERE id = ?', [user.id]);

      // Enregistrer dans auto_blocked_accounts
      const existing = await dbUtils.get('SELECT id FROM auto_blocked_accounts WHERE user_id = ?', [user.id]);
      if (!existing) {
        await dbUtils.run(
          `INSERT INTO auto_blocked_accounts (id, user_id, user_nom, user_email, user_role, violation_count, status)
           VALUES (?, ?, ?, ?, ?, ?, 'blocked')`,
          [uuidv4(), user.id, userNom, user.email || '', user.role_archive || user.role || '', violationCount]
        );
      } else {
        await dbUtils.run(
          'UPDATE auto_blocked_accounts SET violation_count = ?, status = ? WHERE user_id = ?',
          [violationCount, 'blocked', user.id]
        );
      }

      // Envoyer notification à tous les admin_systeme et super_admin
      const admins = await dbUtils.all(
        "SELECT id FROM users WHERE role_archive IN ('admin_systeme', 'super_admin') AND blocked = 0"
      );

      for (const admin of admins) {
        await dbUtils.run(
          `INSERT INTO notifications (id, destinataire_id, emetteur_id, type, titre, contenu, lien, lue)
           VALUES (?, ?, ?, 'moderation', ?, ?, '/users', 0)`,
          [
            uuidv4(),
            admin.id,
            user.id,
            '🚫 Compte bloqué automatiquement',
            `L'utilisateur ${userNom} (${user.email}) a été bloqué automatiquement après ${violationCount} tentatives de publication de contenu pornographique.`
          ]
        );
      }

      logger.warn(`[NSFW] ⛔ COMPTE BLOQUÉ AUTOMATIQUEMENT: ${userNom} (${user.id}) - ${violationCount} violations`);
      return { blocked: true, violationCount };
    }

    return { blocked: false, violationCount };
  } catch (err) {
    logger.error('[NSFW] Erreur enregistrement violation:', err);
    return { blocked: false, violationCount: 0 };
  }
}
