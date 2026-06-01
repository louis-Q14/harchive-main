/**
 * Social Controller
 * Gestion des demandes d'amis et blocage utilisateurs
 */

import { v4 as uuidv4 } from 'uuid';
import { dbUtils } from '../db/database.js';

import logger from '../utils/logger.js';

/**
 * Envoyer une demande d'ami
 * POST /api/social/friend-request/send  { recipientId }
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId) return res.status(400).json({ message: 'recipientId requis' });
    if (senderId === recipientId) return res.status(400).json({ message: 'Vous ne pouvez pas vous ajouter vous-même' });

    // Vérifier si déjà amis
    const sender = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [senderId]);
    const amis = JSON.parse(sender?.amis || '[]');
    if (amis.includes(recipientId)) {
      return res.status(400).json({ message: 'Vous êtes déjà amis' });
    }

    // Vérifier si bloqué (dans un sens ou l'autre)
    const blocked = await dbUtils.get(
      'SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      [senderId, recipientId, recipientId, senderId]
    );
    if (blocked) return res.status(400).json({ message: 'Action impossible' });

    // Vérifier doublon
    const existing = await dbUtils.get(
      `SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
      [senderId, recipientId]
    );
    if (existing) return res.status(400).json({ message: 'Demande déjà envoyée' });

    // Vérifier si la cible a déjà envoyé une demande
    const reverse = await dbUtils.get(
      `SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
      [recipientId, senderId]
    );
    if (reverse) return res.status(400).json({ message: 'Cet utilisateur vous a déjà envoyé une demande' });

    const id = uuidv4();
    await dbUtils.run(
      `INSERT INTO friend_requests (id, sender_id, receiver_id, status) VALUES (?, ?, ?, 'pending')`,
      [id, senderId, recipientId]
    );

    // Créer une notification pour le destinataire
    try {
      const senderInfo = await dbUtils.get('SELECT prenom, nom, post_nom FROM users WHERE id = ?', [senderId]);
      const senderName = [senderInfo?.prenom, senderInfo?.nom, senderInfo?.post_nom].filter(Boolean).join(' ').trim() || 'Un utilisateur';
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, emetteur_id, type, titre, contenu, lien, lue) VALUES (?, ?, ?, 'demande_ami', ?, ?, '/amis', 0)`,
        [uuidv4(), recipientId, senderId, "Nouvelle demande d'ami", `${senderName} vous a envoyé une demande d'ami`]
      );
    } catch (e) { logger.warn('Notification demande_ami error:', e); }

    res.json({ message: "Demande d'ami envoyée", id });
  } catch (error) {
    logger.error('sendFriendRequest error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Accepter une demande d'ami
 * POST /api/social/friend-request/accept  { requestId }
 */
export const acceptFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.body;

    const request = await dbUtils.get(
      `SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
      [requestId, currentUserId]
    );
    if (!request) return res.status(404).json({ message: 'Demande introuvable' });

    const { sender_id, receiver_id } = request;

    // Marquer comme acceptée
    await dbUtils.run(
      `UPDATE friend_requests SET status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [requestId]
    );

    // Ajouter dans les listes amis des deux côtés
    const senderRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [sender_id]);
    const receiverRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [receiver_id]);

    const senderAmis = JSON.parse(senderRow?.amis || '[]');
    const receiverAmis = JSON.parse(receiverRow?.amis || '[]');

    if (!senderAmis.includes(receiver_id)) senderAmis.push(receiver_id);
    if (!receiverAmis.includes(sender_id)) receiverAmis.push(sender_id);

    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(senderAmis), sender_id]
    );
    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(receiverAmis), receiver_id]
    );

    // Notifier l'émetteur que sa demande a été acceptée
    try {
      const receiverInfo = await dbUtils.get('SELECT prenom, nom, post_nom FROM users WHERE id = ?', [receiver_id]);
      const receiverName = [receiverInfo?.prenom, receiverInfo?.nom, receiverInfo?.post_nom].filter(Boolean).join(' ').trim() || 'Un utilisateur';
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, emetteur_id, type, titre, contenu, lien, lue) VALUES (?, ?, ?, 'ami_accepte', ?, ?, '/amis', 0)`,
        [uuidv4(), sender_id, receiver_id, "Demande d'ami acceptée", `${receiverName} a accepté votre demande d'ami`]
      );
    } catch (e) { logger.warn('Notification ami_accepte error:', e); }

    res.json({ message: 'Demande acceptée' });
  } catch (error) {
    logger.error('acceptFriendRequest error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Refuser une demande d'ami
 * POST /api/social/friend-request/reject  { requestId }
 */
export const rejectFriendRequest = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { requestId } = req.body;

    const request = await dbUtils.get(
      `SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
      [requestId, currentUserId]
    );
    if (!request) return res.status(404).json({ message: 'Demande introuvable' });

    await dbUtils.run(
      `UPDATE friend_requests SET status = 'rejected', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [requestId]
    );

    // Notifier l'émetteur que sa demande a été refusée
    try {
      const receiverInfo = await dbUtils.get('SELECT prenom, nom, post_nom FROM users WHERE id = ?', [currentUserId]);
      const receiverName = [receiverInfo?.prenom, receiverInfo?.nom, receiverInfo?.post_nom].filter(Boolean).join(' ').trim() || 'Un utilisateur';
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, emetteur_id, type, titre, contenu, lien, lue) VALUES (?, ?, ?, 'ami_refuse', ?, ?, '/amis', 0)`,
        [uuidv4(), request.sender_id, currentUserId, "Demande d'ami refusée", `${receiverName} a refusé votre demande d'ami`]
      );
    } catch (e) { logger.warn('Notification ami_refuse error:', e); }

    res.json({ message: 'Demande refusée' });
  } catch (error) {
    logger.error('rejectFriendRequest error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Retirer un ami
 * POST /api/social/friend/remove  { friendId }
 */
export const removeFriend = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { friendId } = req.body;

    if (!friendId) return res.status(400).json({ message: 'friendId requis' });

    const meRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [currentUserId]);
    const friendRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [friendId]);

    const myAmis = JSON.parse(meRow?.amis || '[]').filter(id => id !== friendId);
    const friendAmis = JSON.parse(friendRow?.amis || '[]').filter(id => id !== currentUserId);

    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(myAmis), currentUserId]
    );
    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(friendAmis), friendId]
    );

    // Supprimer la demande acceptée entre les deux
    await dbUtils.run(
      `DELETE FROM friend_requests WHERE status IN ('accepted','rejected') AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`,
      [currentUserId, friendId, friendId, currentUserId]
    );

    // Notifier l'ami retiré
    try {
      const userInfo = await dbUtils.get('SELECT prenom, nom, post_nom FROM users WHERE id = ?', [currentUserId]);
      const userName = [userInfo?.prenom, userInfo?.nom, userInfo?.post_nom].filter(Boolean).join(' ').trim() || 'Un utilisateur';
      await dbUtils.run(
        `INSERT INTO notifications (id, destinataire_id, emetteur_id, type, titre, contenu, lien, lue) VALUES (?, ?, ?, 'ami_retire', ?, ?, '/amis', 0)`,
        [uuidv4(), friendId, currentUserId, 'Ami retiré', `${userName} vous a retiré de sa liste d'amis`]
      );
    } catch (e) { logger.warn('Notification ami_retire error:', e); }

    res.json({ message: 'Ami retiré' });
  } catch (error) {
    logger.error('removeFriend error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Bloquer un utilisateur
 * POST /api/social/block  { userId }
 */
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: 'userId requis' });

    const existing = await dbUtils.get(
      'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, userId]
    );
    if (!existing) {
      const id = uuidv4();
      await dbUtils.run(
        'INSERT INTO blocked_users (id, blocker_id, blocked_id) VALUES (?, ?, ?)',
        [id, blockerId, userId]
      );
    }

    // Retirer des amis des deux côtés
    const meRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [blockerId]);
    const themRow = await dbUtils.get('SELECT amis FROM users WHERE id = ?', [userId]);

    const myAmis = JSON.parse(meRow?.amis || '[]').filter(id => id !== userId);
    const theirAmis = JSON.parse(themRow?.amis || '[]').filter(id => id !== blockerId);

    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(myAmis), blockerId]
    );
    await dbUtils.run(
      'UPDATE users SET amis = ? WHERE id = ?',
      [JSON.stringify(theirAmis), userId]
    );

    // Supprimer toutes les demandes entre eux
    await dbUtils.run(
      `DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [blockerId, userId, userId, blockerId]
    );

    res.json({ message: 'Utilisateur bloqué' });
  } catch (error) {
    logger.error('blockUser error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Débloquer un utilisateur
 * POST /api/social/unblock  { userId }
 */
export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: 'userId requis' });

    await dbUtils.run(
      'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
      [blockerId, userId]
    );

    res.json({ message: 'Utilisateur débloqué' });
  } catch (error) {
    logger.error('unblockUser error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Toutes les demandes d'ami impliquant l'utilisateur courant
 * GET /api/social/friend-requests
 */
export const getAllFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await dbUtils.all(
      `SELECT * FROM friend_requests WHERE sender_id = ? OR receiver_id = ? ORDER BY createdAt DESC`,
      [userId, userId]
    );
    res.json({ data: requests });
  } catch (error) {
    logger.error('getAllFriendRequests error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Liste des utilisateurs bloqués par l'utilisateur courant
 * GET /api/social/blocked
 */
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await dbUtils.all(
      `SELECT u.id, u.prenom, u.nom, u.post_nom, u.email, u.photo_url, u.role_archive,
              u.etablissement_nom, u.classe, u.faculte, u.centres_interet
       FROM blocked_users b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = ?`,
      [userId]
    );
    res.json({ data: rows });
  } catch (error) {
    logger.error('getBlockedUsers error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
