import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth.js';
import { dbUtils } from '../db/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── Create / publish a short video ──
router.post('/shorts', verifyToken, async (req, res) => {
  try {
    const { titre, description, video_url, thumbnail_url, duration, width, height, tags, music_name, music_artist, is_from_live, source_live_id } = req.body;
    if (!video_url) return res.status(400).json({ error: 'video_url est requis' });

    const id = uuidv4();
    const user = req.user;

    const [userRow] = await dbUtils.all('SELECT prenom, nom, post_nom, photo_url FROM users WHERE id = ?', [user.id]);
    const creatorNom = userRow
      ? [userRow.prenom, userRow.nom, userRow.post_nom].filter(Boolean).join(' ')
      : 'Utilisateur';

    await dbUtils.run(
      `INSERT INTO short_videos (id, creator_id, creator_nom, creator_photo_url, titre, description, video_url, thumbnail_url, duration, width, height, tags, music_name, music_artist, is_from_live, source_live_id, likes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`,
      [id, user.id, creatorNom, userRow?.photo_url || '', titre || '', description || '', video_url, thumbnail_url || '', duration || 0, width || 0, height || 0, JSON.stringify(tags || []), music_name || '', music_artist || '', is_from_live ? 1 : 0, source_live_id || null]
    );

    const [created] = await dbUtils.all('SELECT * FROM short_videos WHERE id = ?', [id]);
    created.likes = safeParseJSON(created.likes);
    created.tags = safeParseJSON(created.tags);
    res.json(created);
  } catch (err) {
    logger.error('Create short error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Public shorts feed (no auth required) ──
router.get('/shorts/public/feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const shorts = await dbUtils.all(
      `SELECT s.*,
        (s.views * 0.3 + JSON_LENGTH(COALESCE(s.likes, '[]')) * 0.5 + s.nb_commentaires * 0.2
         + GREATEST(0, 7 - DATEDIFF(NOW(), s.created_date)) * 2) AS score
       FROM short_videos s
       WHERE s.status = 'published'
       ORDER BY score DESC, s.created_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const result = shorts.map(s => ({
      ...s,
      likes: safeParseJSON(s.likes),
      tags: safeParseJSON(s.tags),
      is_liked: false,
    }));

    res.json(result);
  } catch (err) {
    logger.error('Get public shorts feed error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get shorts feed (recommendation algorithm) ──
router.get('/shorts/feed', verifyToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;

    // Simple engagement-based recommendation:
    // Score = views * 0.3 + likes_count * 0.5 + comments * 0.2 + recency_boost
    // Recency boost: newer videos get a bonus
    const shorts = await dbUtils.all(
      `SELECT s.*,
        (s.views * 0.3 + JSON_LENGTH(COALESCE(s.likes, '[]')) * 0.5 + s.nb_commentaires * 0.2
         + GREATEST(0, 7 - DATEDIFF(NOW(), s.created_date)) * 2) AS score
       FROM short_videos s
       WHERE s.status = 'published'
       ORDER BY score DESC, s.created_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const result = shorts.map(s => ({
      ...s,
      likes: safeParseJSON(s.likes),
      tags: safeParseJSON(s.tags),
      is_liked: safeParseJSON(s.likes).includes(userId),
    }));

    res.json(result);
  } catch (err) {
    logger.error('Get shorts feed error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get a specific short ──
router.get('/shorts/:id', verifyToken, async (req, res) => {
  try {
    const [short] = await dbUtils.all('SELECT * FROM short_videos WHERE id = ?', [req.params.id]);
    if (!short) return res.status(404).json({ error: 'Short introuvable' });

    // Increment views
    await dbUtils.run('UPDATE short_videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    short.views += 1;

    short.likes = safeParseJSON(short.likes);
    short.tags = safeParseJSON(short.tags);
    short.is_liked = short.likes.includes(req.user.id);
    res.json(short);
  } catch (err) {
    logger.error('Get short error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Like/unlike a short ──
router.post('/shorts/:id/like', verifyToken, async (req, res) => {
  try {
    const [short] = await dbUtils.all('SELECT likes FROM short_videos WHERE id = ?', [req.params.id]);
    if (!short) return res.status(404).json({ error: 'Short introuvable' });

    const likes = safeParseJSON(short.likes);
    const userId = req.user.id;
    const isLiked = likes.includes(userId);

    if (isLiked) {
      const newLikes = likes.filter(id => id !== userId);
      await dbUtils.run('UPDATE short_videos SET likes = ? WHERE id = ?', [JSON.stringify(newLikes), req.params.id]);
      res.json({ liked: false, count: newLikes.length });
    } else {
      likes.push(userId);
      await dbUtils.run('UPDATE short_videos SET likes = ? WHERE id = ?', [JSON.stringify(likes), req.params.id]);
      res.json({ liked: true, count: likes.length });
    }
  } catch (err) {
    logger.error('Like short error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Increment views ──
router.post('/shorts/:id/view', verifyToken, async (req, res) => {
  try {
    await dbUtils.run('UPDATE short_videos SET views = views + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get comments for a short ──
router.get('/shorts/:id/comments', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const comments = await dbUtils.all(
      `SELECT * FROM short_comments WHERE short_id = ? ORDER BY created_date ASC LIMIT ?`,
      [req.params.id, limit]
    );
    res.json(comments.map(c => ({ ...c, likes: safeParseJSON(c.likes) })));
  } catch (err) {
    logger.error('Get short comments error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Post a comment ──
router.post('/shorts/:id/comments', verifyToken, async (req, res) => {
  try {
    const { contenu } = req.body;
    if (!contenu || !contenu.trim()) return res.status(400).json({ error: 'Le commentaire est requis' });

    const id = uuidv4();
    const user = req.user;
    const [userRow] = await dbUtils.all('SELECT prenom, nom, post_nom, photo_url FROM users WHERE id = ?', [user.id]);
    const userName = userRow ? [userRow.prenom, userRow.nom, userRow.post_nom].filter(Boolean).join(' ') : 'Utilisateur';

    await dbUtils.run(
      `INSERT INTO short_comments (id, short_id, user_id, user_nom, user_photo_url, contenu, likes)
       VALUES (?, ?, ?, ?, ?, ?, '[]')`,
      [id, req.params.id, user.id, userName, userRow?.photo_url || '', contenu.trim().slice(0, 1000)]
    );

    // Update comment count
    await dbUtils.run('UPDATE short_videos SET nb_commentaires = nb_commentaires + 1 WHERE id = ?', [req.params.id]);

    const [comment] = await dbUtils.all('SELECT * FROM short_comments WHERE id = ?', [id]);
    comment.likes = safeParseJSON(comment.likes);
    res.json(comment);
  } catch (err) {
    logger.error('Post short comment error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Delete a short ──
router.delete('/shorts/:id', verifyToken, async (req, res) => {
  try {
    const [short] = await dbUtils.all('SELECT creator_id FROM short_videos WHERE id = ?', [req.params.id]);
    if (!short) return res.status(404).json({ error: 'Short introuvable' });
    if (short.creator_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    await dbUtils.run(`UPDATE short_videos SET status = 'deleted' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete short error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get shorts by user ──
router.get('/shorts/user/:userId', verifyToken, async (req, res) => {
  try {
    const shorts = await dbUtils.all(
      `SELECT * FROM short_videos WHERE creator_id = ? AND status = 'published' ORDER BY created_date DESC LIMIT 50`,
      [req.params.userId]
    );
    res.json(shorts.map(s => ({
      ...s,
      likes: safeParseJSON(s.likes),
      tags: safeParseJSON(s.tags),
      is_liked: safeParseJSON(s.likes).includes(req.user.id),
    })));
  } catch (err) {
    logger.error('Get user shorts error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function safeParseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

export default router;
