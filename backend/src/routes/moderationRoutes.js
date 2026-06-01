import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth.js';
import { dbUtils } from '../db/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Middleware admin only
const adminOnly = (req, res, next) => {
  const role = req.user?.role_archive || req.user?.role;
  if (role !== 'admin_systeme' && role !== 'super_admin') {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
};

// ── Liste de toutes les violations NSFW ──
router.get('/moderation/violations', verifyToken, adminOnly, async (req, res) => {
  try {
    const violations = await dbUtils.all(`
      SELECT v.*, u.photo_url as user_photo
      FROM nsfw_violations v
      LEFT JOIN users u ON v.user_id = u.id
      ORDER BY v.created_date DESC
    `);
    res.json(violations);
  } catch (err) {
    logger.error('Get all violations error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Liste des comptes bloqués automatiquement ──
router.get('/moderation/auto-blocked', verifyToken, adminOnly, async (req, res) => {
  try {
    const accounts = await dbUtils.all(`
      SELECT ab.*, 
        (SELECT COUNT(*) FROM nsfw_violations WHERE user_id = ab.user_id) as total_violations
      FROM auto_blocked_accounts ab
      ORDER BY ab.created_date DESC
    `);
    res.json(accounts);
  } catch (err) {
    logger.error('Get auto-blocked accounts error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Détails des violations d'un utilisateur ──
router.get('/moderation/violations/:userId', verifyToken, adminOnly, async (req, res) => {
  try {
    const violations = await dbUtils.all(
      'SELECT * FROM nsfw_violations WHERE user_id = ? ORDER BY created_date DESC',
      [req.params.userId]
    );
    res.json(violations);
  } catch (err) {
    logger.error('Get violations error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Traiter un cas (débloquer ou confirmer le blocage) ──
router.post('/moderation/auto-blocked/:id/review', verifyToken, adminOnly, async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'unblock' | 'confirm'
    const record = await dbUtils.get('SELECT * FROM auto_blocked_accounts WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Enregistrement non trouvé' });

    if (action === 'unblock') {
      // Débloquer l'utilisateur
      await dbUtils.run('UPDATE users SET blocked = 0 WHERE id = ?', [record.user_id]);
      await dbUtils.run(
        'UPDATE auto_blocked_accounts SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_action = ?, review_note = ? WHERE id = ?',
        ['unblocked', req.user.id, 'unblock', note || '', req.params.id]
      );
      
      // Notifier l'utilisateur
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lue)
         VALUES (?, ?, 'moderation', ?, ?, 0)`,
        [uuidv4(), record.user_id, '✅ Compte débloqué',
         'Votre compte a été réexaminé et débloqué par un administrateur. Veuillez respecter les règles de la communauté.']
      );

      logger.info(`[MODERATION] Compte débloqué: ${record.user_email} par admin ${req.user.id}`);
    } else if (action === 'confirm') {
      await dbUtils.run(
        'UPDATE auto_blocked_accounts SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_action = ?, review_note = ? WHERE id = ?',
        ['confirmed', req.user.id, 'confirm', note || '', req.params.id]
      );
      logger.info(`[MODERATION] Blocage confirmé: ${record.user_email} par admin ${req.user.id}`);
    }

    res.json({ success: true, action });
  } catch (err) {
    logger.error('Review auto-blocked error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Réinitialiser les violations d'un compte bloqué ──
router.post('/moderation/auto-blocked/:id/reset-violations', verifyToken, adminOnly, async (req, res) => {
  try {
    const record = await dbUtils.get('SELECT * FROM auto_blocked_accounts WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Enregistrement non trouvé' });

    // Supprimer toutes les violations de cet utilisateur
    await dbUtils.run('DELETE FROM nsfw_violations WHERE user_id = ?', [record.user_id]);
    // Débloquer l'utilisateur
    await dbUtils.run('UPDATE users SET blocked = 0 WHERE id = ?', [record.user_id]);
    // Supprimer l'entrée auto_blocked
    await dbUtils.run('DELETE FROM auto_blocked_accounts WHERE id = ?', [req.params.id]);

    // Notifier l'utilisateur
    await dbUtils.run(
      `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lue)
       VALUES (?, ?, 'moderation', ?, ?, 0)`,
      [uuidv4(), record.user_id, '🔄 Violations réinitialisées',
       'Vos violations ont été réinitialisées par un administrateur. Votre compte est de nouveau actif. Veuillez respecter les règles de la communauté.']
    );

    logger.info(`[MODERATION] Violations réinitialisées: ${record.user_email} par admin ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Reset violations error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ══════════════════════════════════════════════════════════════
// Canal de messages entre utilisateurs bloqués et admins
// ══════════════════════════════════════════════════════════════

// ── Utilisateur bloqué: envoyer un message ──
router.post('/moderation/blocked-messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }
    // Vérifier que l'utilisateur est bien bloqué
    const user = await dbUtils.get('SELECT id, blocked, prenom, nom, email FROM users WHERE id = ?', [userId]);
    if (!user || !user.blocked) {
      return res.status(403).json({ error: 'Action non autorisée' });
    }
    const id = uuidv4();
    const senderName = `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email;
    await dbUtils.run(
      `INSERT INTO blocked_messages (id, user_id, sender_type, sender_id, sender_name, message, read_by_admin, read_by_user)
       VALUES (?, ?, 'user', ?, ?, ?, 0, 1)`,
      [id, userId, userId, senderName, message.trim()]
    );
    // Notification aux admins
    const admins = await dbUtils.all(
      "SELECT id FROM users WHERE role_archive IN ('admin_systeme','super_admin')"
    );
    for (const admin of admins) {
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lue)
         VALUES (?, ?, 'moderation', ?, ?, 0)`,
        [uuidv4(), admin.id, '💬 Message d\'un compte bloqué',
         `${senderName} (${user.email}) a envoyé un message depuis la page de blocage.`]
      );
    }
    res.json({ success: true, id });
  } catch (err) {
    logger.error('Send blocked message error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Utilisateur bloqué: lire ses messages (conversation) ──
router.get('/moderation/my-blocked-messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await dbUtils.all(
      'SELECT * FROM blocked_messages WHERE user_id = ? ORDER BY created_date ASC',
      [userId]
    );
    // Marquer les réponses admin comme lues par l'utilisateur
    await dbUtils.run(
      "UPDATE blocked_messages SET read_by_user = 1 WHERE user_id = ? AND sender_type = 'admin' AND read_by_user = 0",
      [userId]
    );
    // Récupérer les infos de blocage
    const blockInfo = await dbUtils.get(
      'SELECT * FROM auto_blocked_accounts WHERE user_id = ?',
      [userId]
    );
    res.json({ messages, blockInfo });
  } catch (err) {
    logger.error('Get my blocked messages error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: lire les messages d'un utilisateur bloqué ──
router.get('/moderation/blocked-messages/:userId', verifyToken, adminOnly, async (req, res) => {
  try {
    const messages = await dbUtils.all(
      'SELECT * FROM blocked_messages WHERE user_id = ? ORDER BY created_date ASC',
      [req.params.userId]
    );
    // Marquer les messages user comme lus par admin
    await dbUtils.run(
      "UPDATE blocked_messages SET read_by_admin = 1 WHERE user_id = ? AND sender_type = 'user' AND read_by_admin = 0",
      [req.params.userId]
    );
    res.json(messages);
  } catch (err) {
    logger.error('Get blocked messages error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: répondre à un utilisateur bloqué ──
router.post('/moderation/blocked-messages/:userId/reply', verifyToken, adminOnly, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }
    const adminUser = await dbUtils.get('SELECT prenom, nom, email FROM users WHERE id = ?', [req.user.id]);
    const senderName = adminUser ? `${adminUser.prenom || ''} ${adminUser.nom || ''}`.trim() || 'Admin' : 'Admin';
    const id = uuidv4();
    await dbUtils.run(
      `INSERT INTO blocked_messages (id, user_id, sender_type, sender_id, sender_name, message, read_by_admin, read_by_user)
       VALUES (?, ?, 'admin', ?, ?, ?, 1, 0)`,
      [id, req.params.userId, req.user.id, senderName, message.trim()]
    );
    res.json({ success: true, id });
  } catch (err) {
    logger.error('Reply blocked message error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: nombre de messages non lus par utilisateur bloqué ──
router.get('/moderation/blocked-messages-unread', verifyToken, adminOnly, async (req, res) => {
  try {
    const unread = await dbUtils.all(
      `SELECT user_id, COUNT(*) as unread_count 
       FROM blocked_messages 
       WHERE sender_type = 'user' AND read_by_admin = 0 
       GROUP BY user_id`
    );
    res.json(unread);
  } catch (err) {
    logger.error('Get unread blocked messages error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Stats de modération ──
router.get('/moderation/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    const [totalViolations] = await dbUtils.all('SELECT COUNT(*) as cnt FROM nsfw_violations');
    const [totalBlocked] = await dbUtils.all("SELECT COUNT(*) as cnt FROM auto_blocked_accounts WHERE status = 'blocked'");
    const [totalReviewed] = await dbUtils.all("SELECT COUNT(*) as cnt FROM auto_blocked_accounts WHERE status IN ('unblocked','confirmed')");
    const [totalPubs] = await dbUtils.all('SELECT COUNT(*) as cnt FROM publications');
    const [totalShorts] = await dbUtils.all("SELECT COUNT(*) as cnt FROM short_videos WHERE status = 'published'");
    const [totalLives] = await dbUtils.all('SELECT COUNT(*) as cnt FROM live_streams');
    res.json({
      totalViolations: totalViolations?.cnt || 0,
      totalBlocked: totalBlocked?.cnt || 0,
      totalReviewed: totalReviewed?.cnt || 0,
      totalPubs: totalPubs?.cnt || 0,
      totalShorts: totalShorts?.cnt || 0,
      totalLives: totalLives?.cnt || 0
    });
  } catch (err) {
    logger.error('Moderation stats error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ══════════════════════════════════════════════════════════════
// Admin: Modération de tout le contenu (publications, shorts, lives)
// ══════════════════════════════════════════════════════════════

// ── Admin: lister toutes les publications ──
router.get('/moderation/publications', verifyToken, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const pubs = await dbUtils.all(
      'SELECT * FROM publications ORDER BY created_date DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json(pubs);
  } catch (err) {
    logger.error('Moderation list publications error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: supprimer une publication ──
router.delete('/moderation/publications/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const pub = await dbUtils.get('SELECT * FROM publications WHERE id = ?', [req.params.id]);
    if (!pub) return res.status(404).json({ error: 'Publication introuvable' });
    
    // Supprimer les commentaires associés
    await dbUtils.run('DELETE FROM commentaires WHERE publication_id = ?', [req.params.id]);
    // Supprimer la publication
    await dbUtils.run('DELETE FROM publications WHERE id = ?', [req.params.id]);
    
    logger.info(`[MODERATION] Publication supprimée: ${req.params.id} par admin ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Moderation delete publication error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: masquer/démasquer une publication ──
router.post('/moderation/publications/:id/toggle-visibility', verifyToken, adminOnly, async (req, res) => {
  try {
    const pub = await dbUtils.get('SELECT masque FROM publications WHERE id = ?', [req.params.id]);
    if (!pub) return res.status(404).json({ error: 'Publication introuvable' });
    
    const newVal = pub.masque ? 0 : 1;
    await dbUtils.run('UPDATE publications SET masque = ? WHERE id = ?', [newVal, req.params.id]);
    
    logger.info(`[MODERATION] Publication ${newVal ? 'masquée' : 'démasquée'}: ${req.params.id} par admin ${req.user.id}`);
    res.json({ success: true, masque: newVal });
  } catch (err) {
    logger.error('Moderation toggle pub visibility error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: lister tous les shorts ──
router.get('/moderation/shorts', verifyToken, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const shorts = await dbUtils.all(
      `SELECT * FROM short_videos ORDER BY created_date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json(shorts);
  } catch (err) {
    logger.error('Moderation list shorts error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: supprimer un short ──
router.delete('/moderation/shorts/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const short = await dbUtils.get('SELECT * FROM short_videos WHERE id = ?', [req.params.id]);
    if (!short) return res.status(404).json({ error: 'Short introuvable' });
    
    await dbUtils.run('DELETE FROM short_comments WHERE short_id = ?', [req.params.id]);
    await dbUtils.run('DELETE FROM short_videos WHERE id = ?', [req.params.id]);
    
    logger.info(`[MODERATION] Short supprimé: ${req.params.id} par admin ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Moderation delete short error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: lister tous les lives ──
router.get('/moderation/lives', verifyToken, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const lives = await dbUtils.all(
      'SELECT * FROM live_streams ORDER BY created_date DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    res.json(lives);
  } catch (err) {
    logger.error('Moderation list lives error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: supprimer un live (et ses messages) ──
router.delete('/moderation/lives/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const live = await dbUtils.get('SELECT * FROM live_streams WHERE id = ?', [req.params.id]);
    if (!live) return res.status(404).json({ error: 'Live introuvable' });
    
    await dbUtils.run('DELETE FROM live_chat_messages WHERE stream_id = ?', [req.params.id]);
    await dbUtils.run('DELETE FROM live_streams WHERE id = ?', [req.params.id]);
    
    logger.info(`[MODERATION] Live supprimé: ${req.params.id} par admin ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Moderation delete live error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Admin: forcer l'arrêt d'un live ──
router.post('/moderation/lives/:id/force-end', verifyToken, adminOnly, async (req, res) => {
  try {
    const live = await dbUtils.get('SELECT * FROM live_streams WHERE id = ?', [req.params.id]);
    if (!live) return res.status(404).json({ error: 'Live introuvable' });
    
    await dbUtils.run("UPDATE live_streams SET status = 'ended', ended_at = NOW() WHERE id = ?", [req.params.id]);
    
    logger.info(`[MODERATION] Live forcé fin: ${req.params.id} par admin ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Moderation force-end live error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
