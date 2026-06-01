/**
 * Generic Data Controller
 * Handles CRUD operations for all entities
 */

import { v4 as uuidv4 } from 'uuid';
import { dbUtils } from '../db/database.js';

import logger from '../utils/logger.js';

/**
 * Parse JSON string fields in a row returned from SQLite.
 * SQLite stores arrays/objects as JSON strings; this restores them.
 */
const parseJsonFields = (row) => {
  if (!row || typeof row !== 'object') return row;
  const result = { ...row };
  for (const [key, val] of Object.entries(result)) {
    if (typeof val === 'string' && val.length > 0 && (val[0] === '[' || val[0] === '{')) {
      try {
        result[key] = JSON.parse(val);
      } catch {
        // keep as string if not valid JSON
      }
    }
  }
  return result;
};

/**
 * Validate that a string is a safe SQL column name (alphanumeric + underscore only)
 */
const isSafeColumnName = (name) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

// Map entity names to table names
const entityTableMap = {
  User: 'users',
  Publication: 'publications',
  Commentaire: 'commentaires',
  DemandeInscription: 'inscription_requests',
  DemandeInscriptionParent: 'inscription_parents',
  DemandeInscriptionEtablissement: 'inscription_etablissements',
  Notification: 'notifications',
  Classe: 'classes',
  Matiere: 'matieres',
  Etudiant: 'students',
  Etablissement: 'establishments',
  EtablissementAgree: 'etablissements_agrees',
  EtablissementFaculte: 'etablissement_facultes',
  EtablissementDepartement: 'etablissement_departements',
  EtablissementOrientation: 'etablissement_orientations',
  EtablissementOption: 'etablissement_options',
  Promotion: 'promotions',
  AssignationProfesseur: 'assignation_professeurs',
  CalendrierAcademique: 'calendrier_academique',
  InstructionCours: 'instruction_cours',
  ListePresence: 'liste_presence',
  Presence: 'presences',
  Photo: 'photos',
  Conversation: 'conversations',
  Message: 'messages',
  Group: 'groups',
  GroupMessage: 'group_messages',
  NoteEtudiant: 'notes_etudiants',
  NoteArchive: 'notes_archive',
  DossierInscription: 'dossiers_inscription',
  CanalRenvoi: 'canaux_renvoi',
  FichePreparation: 'fiches_preparation',
  QuestionnaireExamen: 'questionnaires_examen',
  RessourcePedagogique: 'ressources_pedagogiques',
  SequencePedagogique: 'sequences_pedagogiques',
  Livre: 'livres',
  CommentaireLivre: 'commentaires_livres',
  TravailAcademique: 'travaux_academiques',
  CommentaireTravail: 'commentaires_travaux',
};

/**
 * Get entity table name
 */
const getTableName = (entityName) => {
  return entityTableMap[entityName] || null;
};

/**
 * Tables that only admins can write to (create/update/delete).
 * All authenticated users can still read (query/get) these.
 */
const adminWriteOnly = new Set([
  'etablissements_agrees', 'etablissement_facultes', 'etablissement_departements',
  'etablissement_orientations', 'etablissement_options', 'promotions',
  'matieres', 'assignation_professeurs', 'calendrier_academique',
]);

/**
 * Tables that only admins can read.
 */
const adminReadOnly = new Set([
  'inscription_requests', 'inscription_parents', 'inscription_etablissements',
]);

const ADMIN_ROLES = ['admin_systeme', 'super_admin', 'admin_etablissement', 'admin_ministeriel'];

/**
 * Ownership column per table.
 * For tables with strict read ownership, non-admin users can only read their own records.
 * For all ownership tables, non-admin users can only update/delete their own records.
 */
const ownershipColumn = {
  // Strict: non-admin can only READ + WRITE own records
  notifications: 'destinataire_id',
  dossiers_inscription: 'etudiant_id',
  notes_etudiants: 'professeur_id',
  notes_archive: 'professeur_id',
  // Write-only ownership: anyone can read, but only owner can update/delete
  publications: 'auteur_id',
  commentaires: 'auteur_id',
  photos: 'created_by',
  fiches_preparation: 'professeur_id',
  questionnaires_examen: 'professeur_id',
  ressources_pedagogiques: 'professeur_id',
  sequences_pedagogiques: 'professeur_id',
  liste_presence: 'professeur_id',
  presences: 'professeur_id',
  groups: 'admin_id',
  group_messages: 'sender_id',
  messages: 'auteur_id',
};

/**
 * Tables where non-admin users can ONLY see their own records (strict read restriction).
 */
const strictReadOwnership = new Set([
  'notifications', 'dossiers_inscription', 'notes_etudiants', 'notes_archive',
]);

/**
 * Check if user has admin role
 */
const isAdmin = (user) => {
  const role = user?.role_archive || user?.role;
  return ADMIN_ROLES.includes(role);
};

/**
 * Query entities with filters
 */

/**
 * Public endpoint: list all etablissements agrees (no auth required)
 */
export const queryPublicEtablissements = async (req, res) => {
  try {
    const results = await dbUtils.all('SELECT * FROM etablissements_agrees', []);
    res.json(results || []);
  } catch (error) {
    logger.error('Public etablissements query error:', error);
    res.status(500).json({ status: 500, message: 'Failed to query etablissements' });
  }
};

/**
 * Public endpoint: get academic structure for a given establishment
 */
export const queryPublicStructure = async (req, res) => {
  try {
    const { etablissementId } = req.params;
    const { nom } = req.query;
    if (!etablissementId) {
      return res.status(400).json({ status: 400, message: 'etablissementId requis' });
    }

    // The etablissement_id in structure tables may differ from etablissements_agrees ID
    // So we search by both ID and by nom
    let idClause = 'etablissement_id = ?';
    let params = [etablissementId];
    if (nom) {
      idClause = '(etablissement_id = ? OR etablissement_nom = ?)';
      params = [etablissementId, nom];
    }

    const [facultes, departements, orientations, options, promotions] = await Promise.all([
      dbUtils.all(`SELECT * FROM etablissement_facultes WHERE ${idClause}`, params),
      dbUtils.all(`SELECT * FROM etablissement_departements WHERE ${idClause}`, params),
      dbUtils.all(`SELECT * FROM etablissement_orientations WHERE ${idClause}`, params),
      dbUtils.all(`SELECT * FROM etablissement_options WHERE ${idClause}`, params),
      dbUtils.all(`SELECT * FROM promotions WHERE ${idClause}`, params),
    ]);
    res.json({ facultes: facultes || [], departements: departements || [], orientations: orientations || [], options: options || [], promotions: promotions || [] });
  } catch (error) {
    logger.error('Public structure query error:', error);
    res.status(500).json({ status: 500, message: 'Failed to query structure' });
  }
};

/**
 * Public: query publications visible to everyone (publique + etablissement)
 */
export const queryPublicPublications = async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const sql = `SELECT p.*, u.photo_url AS auteur_current_photo_url FROM publications p LEFT JOIN users u ON p.auteur_id = u.id WHERE p.visibilite IN ('publique', 'etablissement') AND (p.cible_profil_id IS NULL OR p.cible_profil_id = '') ORDER BY p.created_date DESC LIMIT ? OFFSET ?`;
    const results = await dbUtils.all(sql, [Number(limit), Number(offset)]);
    res.json({ status: 200, data: results || [] });
  } catch (error) {
    logger.error('Public publications query error:', error);
    res.status(500).json({ status: 500, message: 'Failed to query public publications' });
  }
};

export const queryEntity = async (req, res) => {
  try {
    const { entityName } = req.params;
    const { filters = [], limit, offset, orderBy } = req.body;

    const tableName = getTableName(entityName);
    if (!tableName) {
      return res.status(400).json({
        status: 400,
        message: `Unknown entity: ${entityName}`
      });
    }

    // Admin-only read tables (with exception: users can query their own inscription record)
    if (adminReadOnly.has(tableName) && !isAdmin(req.user)) {
      // Allow non-admin users to query their own inscription record by email
      const isOwnInscriptionQuery = (
        tableName === 'inscription_requests' ||
        tableName === 'inscription_parents' ||
        tableName === 'inscription_etablissements'
      ) && filters.some(f =>
        (f.email === req.user.email) ||
        (f.email_responsable === req.user.email) ||
        (f.field === 'email' && f.value === req.user.email) ||
        (f.field === 'email_responsable' && f.value === req.user.email)
      );
      if (!isOwnInscriptionQuery) {
        return res.status(403).json({ status: 403, message: 'Accès refusé' });
      }
    }

    // Strict read ownership: non-admin users can only see their own records
    if (strictReadOwnership.has(tableName) && !isAdmin(req.user) && ownershipColumn[tableName]) {
      const ownerCol = ownershipColumn[tableName];
      filters.push({ field: ownerCol, value: req.user.id });
    }

    // Special case: users table — non-admin can query all users but sensitive fields are stripped
    const isUserQuery = tableName === 'users' && !isAdmin(req.user);

    // Build SQL query with filters
    let sql = `SELECT * FROM ${tableName}`;
    let params = [];

    if (filters && filters.length > 0) {
      const whereClauses = filters.flatMap(filter => {
        // Support both {field, value} and {key: value} formats
        if (filter.field && filter.value !== undefined) {
          if (!isSafeColumnName(filter.field)) return [];
          params.push(filter.value);
          return [`\`${filter.field}\` = ?`];
        }
        // Key-value object format: { etablissement_id: "xxx", statut: "approuvee" }
        return Object.entries(filter).map(([key, val]) => {
          if (!isSafeColumnName(key)) return null;
          params.push(val);
          return `\`${key}\` = ?`;
        }).filter(Boolean);
      });
      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    if (orderBy) {
      const desc = orderBy.startsWith('-');
      const col = desc ? orderBy.slice(1) : orderBy;
      if (!isSafeColumnName(col)) {
        return res.status(400).json({ status: 400, message: 'Invalid orderBy column name' });
      }
      sql += ` ORDER BY \`${col}\` ${desc ? 'DESC' : 'ASC'}`;
    }

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(Number(limit));
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(Number(offset));
      }
    }

    const results = await dbUtils.all(sql, params);

    // Strip sensitive fields from other users' records
    let data = (results || []).map(parseJsonFields);
    if (isUserQuery) {
      const SENSITIVE_FIELDS = ['password_hash', 'data'];
      data = data.map(row => {
        if (row.id === req.user.id) return row;
        const safe = { ...row };
        for (const f of SENSITIVE_FIELDS) delete safe[f];
        return safe;
      });
    }

    res.json({
      status: 200,
      data
    });
  } catch (error) {
    logger.error('Query entity error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to query entity'
    });
  }
};

/**
 * Get single entity by ID
 */
export const getEntityById = async (req, res) => {
  try {
    const { entityName, entityId } = req.params;

    const tableName = getTableName(entityName);
    if (!tableName) {
      return res.status(400).json({
        status: 400,
        message: `Unknown entity: ${entityName}`
      });
    }

    const result = await dbUtils.get(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [entityId]
    );

    if (!result) {
      return res.status(404).json({
        status: 404,
        message: `${entityName} not found`
      });
    }

    // Ownership check: strict-read tables and users table
    if (!isAdmin(req.user)) {
      if (tableName === 'users' && result.id !== req.user.id) {
        // Allow viewing other users but strip sensitive fields
        const SENSITIVE_FIELDS = ['password_hash', 'data'];
        const safe = { ...result };
        for (const f of SENSITIVE_FIELDS) delete safe[f];
        return res.json({ status: 200, data: parseJsonFields(safe) });
      }
      const ownerCol = ownershipColumn[tableName];
      if (ownerCol && strictReadOwnership.has(tableName) && result[ownerCol] !== req.user.id) {
        return res.status(403).json({ status: 403, message: 'Accès refusé' });
      }
    }

    res.json({
      status: 200,
      data: parseJsonFields(result)
    });
  } catch (error) {
    logger.error('Get entity error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to get entity'
    });
  }
};

/**
 * Create entity
 */
export const createEntity = async (req, res) => {
  try {
    const { entityName } = req.params;
    const data = req.body;

    const tableName = getTableName(entityName);
    if (!tableName) {
      return res.status(400).json({
        status: 400,
        message: `Unknown entity: ${entityName}`
      });
    }

    // Admin-only write tables
    if (adminWriteOnly.has(tableName) && !isAdmin(req.user)) {
      return res.status(403).json({ status: 403, message: 'Accès refusé. Écriture réservée aux administrateurs.' });
    }

    const id = data.id || uuidv4();
    const { id: _ignoreId, ...rest } = data;
    
    // Validate all field names to prevent SQL injection
    const unsafeFields = Object.keys(rest).filter(f => !isSafeColumnName(f));
    if (unsafeFields.length > 0) {
      return res.status(400).json({ status: 400, message: `Invalid field names: ${unsafeFields.join(', ')}` });
    }
    
    const fields = ['id', ...Object.keys(rest)];
    const values = [id, ...Object.values(rest).map(v => Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v)];
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${tableName} (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`;

    await dbUtils.run(sql, values);

    res.status(201).json({
      status: 201,
      message: `${entityName} created successfully`,
      data: parseJsonFields({ id, ...data })
    });
  } catch (error) {
    logger.error('Create entity error:', error);
    res.status(400).json({
      status: 400,
      message: 'Failed to create entity'
    });
  }
};

/**
 * Update entity
 */
export const updateEntity = async (req, res) => {
  try {
    const { entityName, entityId } = req.params;
    const data = req.body;

    const tableName = getTableName(entityName);
    if (!tableName) {
      return res.status(400).json({
        status: 400,
        message: `Unknown entity: ${entityName}`
      });
    }

    // Admin-only write tables
    if (adminWriteOnly.has(tableName) && !isAdmin(req.user)) {
      return res.status(403).json({ status: 403, message: 'Accès refusé. Écriture réservée aux administrateurs.' });
    }

    // Ownership check: non-admin can only update their own records
    if (!isAdmin(req.user)) {
      if (tableName === 'users' && entityId !== req.user.id) {
        return res.status(403).json({ status: 403, message: 'Accès refusé' });
      }
      const ownerCol = ownershipColumn[tableName];
      if (ownerCol) {
        const existing = await dbUtils.get(`SELECT \`${ownerCol}\` FROM ${tableName} WHERE id = ?`, [entityId]);
        if (existing && existing[ownerCol] !== req.user.id) {
          return res.status(403).json({ status: 403, message: 'Accès refusé' });
        }
      }
    }

    const fields = Object.keys(data);
    
    // Validate all field names to prevent SQL injection
    const unsafeFields = fields.filter(f => !isSafeColumnName(f));
    if (unsafeFields.length > 0) {
      return res.status(400).json({ status: 400, message: `Invalid field names: ${unsafeFields.join(', ')}` });
    }
    
    const values = [...Object.values(data).map(v => {
      if (Array.isArray(v) || (typeof v === 'object' && v !== null)) return JSON.stringify(v);
      if (v === '' || v === undefined) return null;
      return v;
    }), entityId];
    const setClause = fields.map(f => `\`${f}\` = ?`).join(', ');

    // Detect correct timestamp column (notifications has none, skip for it)
    const tablesWithNoTimestamp = ['notifications', 'livres', 'commentaires_livres', 'travaux_academiques', 'commentaires_travaux'];
    const tablesWithUpdatedDate = ['publications', 'commentaires', 'photos', 'messages'];
    let sql;
    if (tablesWithNoTimestamp.includes(tableName)) {
      sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    } else {
      const tsCol = tablesWithUpdatedDate.includes(tableName) ? 'updated_date' : 'updatedAt';
      sql = `UPDATE ${tableName} SET ${setClause}, ${tsCol} = CURRENT_TIMESTAMP WHERE id = ?`;
    }

    await dbUtils.run(sql, values);

    const updated = await dbUtils.get(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [entityId]
    );

    res.json({
      status: 200,
      message: `${entityName} updated successfully`,
      data: parseJsonFields(updated)
    });
  } catch (error) {
    logger.error('Update entity error:', error);
    res.status(400).json({
      status: 400,
      message: 'Failed to update entity'
    });
  }
};

/**
 * Delete entity
 */
export const deleteEntity = async (req, res) => {
  try {
    const { entityName, entityId } = req.params;

    const tableName = getTableName(entityName);
    if (!tableName) {
      return res.status(400).json({
        status: 400,
        message: `Unknown entity: ${entityName}`
      });
    }

    // Only admins can delete from protected tables; regular users can only delete their own records from allowed tables
    if ((adminWriteOnly.has(tableName) || adminReadOnly.has(tableName)) && !isAdmin(req.user)) {
      return res.status(403).json({ status: 403, message: 'Accès refusé. Suppression réservée aux administrateurs.' });
    }

    // Ownership check: non-admin can only delete their own records
    if (!isAdmin(req.user)) {
      if (tableName === 'users') {
        return res.status(403).json({ status: 403, message: 'Accès refusé' });
      }
      const ownerCol = ownershipColumn[tableName];
      if (ownerCol) {
        const existing = await dbUtils.get(`SELECT * FROM ${tableName} WHERE id = ?`, [entityId]);
        if (existing && existing[ownerCol] !== req.user.id) {
          // Allow profile owner to delete wall posts on their profile
          if (tableName === 'publications' && existing.cible_profil_id === req.user.id) {
            // Profile owner can delete posts on their wall — allowed
          } else if (tableName === 'commentaires' && existing.publication_id) {
            // Allow publication author or profile wall owner to delete comments on their publication
            const pub = await dbUtils.get('SELECT auteur_id, cible_profil_id FROM publications WHERE id = ?', [existing.publication_id]);
            if (!pub || (pub.auteur_id !== req.user.id && pub.cible_profil_id !== req.user.id)) {
              return res.status(403).json({ status: 403, message: 'Accès refusé' });
            }
          } else {
            return res.status(403).json({ status: 403, message: 'Accès refusé' });
          }
        }
      }
    }

    // For publications, delete associated comments first to avoid FK constraint violation
    if (tableName === 'publications') {
      await dbUtils.run('DELETE FROM commentaires WHERE publication_id = ?', [entityId]);
    }

    await dbUtils.run(
      `DELETE FROM ${tableName} WHERE id = ?`,
      [entityId]
    );

    res.json({
      status: 200,
      message: `${entityName} deleted successfully`
    });
  } catch (error) {
    logger.error('Delete entity error:', error);
    res.status(400).json({
      status: 400,
      message: 'Failed to delete entity'
    });
  }
};

export default { queryEntity, getEntityById, createEntity, updateEntity, deleteEntity };
