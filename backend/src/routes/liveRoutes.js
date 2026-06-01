import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth.js';
import { dbUtils } from '../db/database.js';
import { getActiveStreams } from '../ws/liveWebSocket.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── Create a new live stream (go live) ──
router.post('/live/streams', verifyToken, async (req, res) => {
  try {
    const { titre, description, tags } = req.body;
    if (!titre || !titre.trim()) {
      return res.status(400).json({ error: 'Le titre est requis' });
    }
    const id = uuidv4();
    const user = req.user;

    // Fetch full user info for name/photo
    const [userRow] = await dbUtils.all('SELECT prenom, nom, post_nom, photo_url FROM users WHERE id = ?', [user.id]);
    const streamerNom = userRow
      ? [userRow.prenom, userRow.nom, userRow.post_nom].filter(Boolean).join(' ')
      : user.email || 'Utilisateur';

    await dbUtils.run(
      `INSERT INTO live_streams (id, streamer_id, streamer_nom, streamer_photo_url, titre, description, tags, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'live')`,
      [id, user.id, streamerNom, userRow?.photo_url || '', titre.trim(), description || '', JSON.stringify(tags || [])]
    );

    res.json({
      id,
      streamer_id: user.id,
      streamer_nom: streamerNom,
      titre: titre.trim(),
      status: 'live',
    });
  } catch (err) {
    logger.error('Create live stream error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get all active (live) streams ──
router.get('/live/streams', verifyToken, async (req, res) => {
  try {
    const streams = await dbUtils.all(
      `SELECT * FROM live_streams WHERE status = 'live' ORDER BY started_at DESC`
    );
    // Merge with in-memory viewer counts
    const active = getActiveStreams();
    const activeMap = new Map(active.map(s => [s.id, s]));

    const merged = streams.map(s => ({
      ...s,
      viewer_count: activeMap.get(s.id)?.viewerCount || 0,
      tags: safeParseJSON(s.tags),
      total_reactions: safeParseJSON(s.total_reactions),
    }));

    res.json(merged);
  } catch (err) {
    logger.error('Get live streams error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get a specific stream ──
router.get('/live/streams/:id', verifyToken, async (req, res) => {
  try {
    const [stream] = await dbUtils.all('SELECT * FROM live_streams WHERE id = ?', [req.params.id]);
    if (!stream) return res.status(404).json({ error: 'Stream introuvable' });

    stream.tags = safeParseJSON(stream.tags);
    stream.total_reactions = safeParseJSON(stream.total_reactions);

    res.json(stream);
  } catch (err) {
    logger.error('Get stream error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── End a live stream ──
router.post('/live/streams/:id/end', verifyToken, async (req, res) => {
  try {
    const [stream] = await dbUtils.all('SELECT * FROM live_streams WHERE id = ?', [req.params.id]);
    if (!stream) return res.status(404).json({ error: 'Stream introuvable' });
    if (stream.streamer_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    await dbUtils.run(
      `UPDATE live_streams SET status = 'ended', ended_at = NOW(), viewer_count = 0 WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('End stream error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get past streams (replays) ──
router.get('/live/replays', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const streams = await dbUtils.all(
      `SELECT * FROM live_streams WHERE status = 'ended' AND recording_url IS NOT NULL
       ORDER BY ended_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json(streams.map(s => ({ ...s, tags: safeParseJSON(s.tags) })));
  } catch (err) {
    logger.error('Get replays error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Get chat history for a stream ──
router.get('/live/streams/:id/chat', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const messages = await dbUtils.all(
      `SELECT * FROM live_chat_messages WHERE stream_id = ? ORDER BY created_date ASC LIMIT ?`,
      [req.params.id, limit]
    );
    res.json(messages);
  } catch (err) {
    logger.error('Get chat error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function safeParseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

export default router;
