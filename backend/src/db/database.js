import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { seedEtablissementsAgrees } from './seed-etablissements.js';

dotenv.config();

import logger from '../utils/logger.js';

/** @type {mysql.Pool} */
let pool = null;

/**
 * Initialize MySQL connection pool
 */
export const initializeDatabase = async () => {
  const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    logger.error(`❌ Missing required MySQL env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT, 10),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });

    // Test connection
    const conn = await pool.getConnection();
    const [[row]] = await conn.query('SELECT VERSION() AS version');
    conn.release();
    logger.info('✅ MySQL connected:', row.version);

    // Initialize schema
    await initializeSchema();

    return pool;
  } catch (error) {
    logger.error('❌ MySQL connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Get the connection pool
 */
export const getDatabase = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

// ─── Compatibility layer ───
// SQLite's db.run returns { lastID, changes }
// mysql2 returns [ResultSetHeader] for INSERT/UPDATE/DELETE
// mysql2 returns [rows] for SELECT
// We wrap to keep the same interface used by all controllers.

const dbRun = async (sql, params = []) => {
  const mysqlSql = sqliteToMysql(sql);
  const [result] = await pool.query(mysqlSql, convertParams(params));
  // Return an object similar to SQLite's `this` from db.run
  return { lastID: result.insertId, changes: result.affectedRows };
};

const dbAll = async (sql, params = []) => {
  const mysqlSql = sqliteToMysql(sql);
  const [rows] = await pool.query(mysqlSql, convertParams(params));
  return rows;
};

const dbGet = async (sql, params = []) => {
  const mysqlSql = sqliteToMysql(sql);
  const [rows] = await pool.query(mysqlSql, convertParams(params));
  return rows[0] || undefined;
};

/**
 * Convert SQLite-specific SQL syntax to MySQL equivalents.
 * Handles the differences found in this codebase.
 */
function sqliteToMysql(sql) {
  let s = sql;
  // INSERT OR IGNORE → INSERT IGNORE
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');
  // COLLATE NOCASE → remove (MySQL utf8mb4_unicode_ci is case-insensitive by default)
  s = s.replace(/\s+COLLATE\s+NOCASE/gi, '');
  // Double-quoted identifiers → backtick-quoted (MySQL uses backticks for identifiers)
  // Match "word" used as column identifiers in WHERE, ORDER BY, SET, etc.
  s = s.replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"/g, '`$1`');
  return s;
}

/**
 * Convert ISO 8601 datetime strings in params to MySQL DATETIME format.
 * e.g. "2026-04-01T23:00:00.000Z" → "2026-04-01 23:00:00"
 */
function convertParams(params) {
  return params.map(p => {
    if (typeof p === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(p)) {
      return p.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
    }
    return p;
  });
}

/**
 * Check if a table exists in MySQL
 */
async function tableExists(tableName) {
  const row = await dbGet(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.MYSQL_DATABASE || 'harchive', tableName]
  );
  return !!row;
}

/**
 * Get column names for a table (replaces PRAGMA table_info)
 */
async function getColumnNames(tableName) {
  const rows = await dbAll(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.MYSQL_DATABASE || 'harchive', tableName]
  );
  return rows.map(r => r.COLUMN_NAME);
}

/**
 * Safely add a column if it doesn't exist
 */
async function addColumnIfNotExists(tableName, colName, colDef) {
  const cols = await getColumnNames(tableName);
  if (!cols.includes(colName)) {
    await dbRun(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
    logger.info(`🔨 Added ${colName} column to ${tableName}`);
    return true;
  }
  return false;
}

// ─── Schema initialization ───

const createInscriptionTables = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS inscription_requests (
      id VARCHAR(36) PRIMARY KEY,
      type_utilisateur VARCHAR(50) DEFAULT 'etudiant',
      nom VARCHAR(255), post_nom VARCHAR(255), prenom VARCHAR(255),
      email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
      telephone VARCHAR(50), sexe VARCHAR(20), nationalite VARCHAR(100), etat_civil VARCHAR(50),
      date_naissance VARCHAR(50), lieu_naissance VARCHAR(255), matricule VARCHAR(100),
      nom_pere VARCHAR(255), nom_mere VARCHAR(255), province_origine VARCHAR(255),
      district VARCHAR(255), territoire VARCHAR(255), adresse_candidat TEXT,
      ecole_secondaire VARCHAR(255), adresse_ecole TEXT, centre_exetat VARCHAR(255),
      section_secondaire VARCHAR(255), annee_secondaire VARCHAR(50), pourcentage_obtenu VARCHAR(50),
      numero_diplome_secondaire VARCHAR(100), annee_obtention_diplome VARCHAR(50),
      numero_diplome VARCHAR(100), specialite VARCHAR(255),
      etablissement_nom VARCHAR(255), etablissement_id VARCHAR(36),
      faculte VARCHAR(255), departement VARCHAR(255), orientation VARCHAR(255), option_filiere VARCHAR(255),
      \`option\` VARCHAR(255) DEFAULT '', classe VARCHAR(255),
      piece_jointe_diplome LONGTEXT,
      piece_jointe_bulletin LONGTEXT,
      piece_jointe_bulletin_2 LONGTEXT,
      piece_jointe_attestation_naissance LONGTEXT,
      piece_jointe_bonne_vie LONGTEXT,
      statut_diplome VARCHAR(50) DEFAULT 'en_attente', statut_bulletin_1 VARCHAR(50) DEFAULT 'en_attente',
      statut_bulletin_2 VARCHAR(50) DEFAULT 'en_attente', statut_attestation_naissance VARCHAR(50) DEFAULT 'en_attente',
      statut_bonne_vie VARCHAR(50) DEFAULT 'en_attente',
      motif_rejet_diplome TEXT, motif_rejet_bulletin_1 TEXT,
      motif_rejet_bulletin_2 TEXT, motif_rejet_attestation_naissance TEXT,
      motif_rejet_bonne_vie TEXT,
      user_id VARCHAR(36) DEFAULT '',
      statut VARCHAR(50) DEFAULT 'en_attente', motif_rejet TEXT, data LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS inscription_parents (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255), post_nom VARCHAR(255), prenom VARCHAR(255),
      email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
      telephone VARCHAR(50), adresse TEXT,
      nom_enfant VARCHAR(255), matricule_enfant VARCHAR(100), etablissement_nom VARCHAR(255),
      enfants_supplementaires LONGTEXT,
      statut VARCHAR(50) DEFAULT 'en_attente', motif_rejet TEXT, data LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS inscription_etablissements (
      id VARCHAR(36) PRIMARY KEY,
      nom_etablissement VARCHAR(255), code_etablissement VARCHAR(100),
      type VARCHAR(50) DEFAULT 'universite',
      adresse TEXT, ville VARCHAR(255), province VARCHAR(255), telephone VARCHAR(50), email_etablissement VARCHAR(255),
      nom_responsable VARCHAR(255), prenom_responsable VARCHAR(255),
      email_responsable VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
      telephone_responsable VARCHAR(50),
      statut VARCHAR(50) DEFAULT 'en_attente', motif_rejet TEXT, data LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      verified TINYINT(1) DEFAULT 0,
      attempts INT DEFAULT 0,
      expires_at DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ev_email (email),
      INDEX idx_ev_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      destinataire_id VARCHAR(36) NOT NULL,
      emetteur_id VARCHAR(36),
      type VARCHAR(50) DEFAULT 'inscription',
      titre VARCHAR(500),
      contenu TEXT,
      lien VARCHAR(500),
      lue TINYINT(1) DEFAULT 0,
      metadata LONGTEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_destinataire (destinataire_id),
      INDEX idx_notifications_created (created_date DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(36) PRIMARY KEY,
      participants LONGTEXT,
      participants_details LONGTEXT,
      dernier_message TEXT,
      dernier_message_date DATETIME,
      dernier_message_auteur VARCHAR(36),
      dernier_message_type VARCHAR(50) DEFAULT 'text',
      non_lu LONGTEXT,
      epingle_par LONGTEXT,
      archive_par LONGTEXT,
      muet_par LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      auteur_id VARCHAR(36) NOT NULL,
      contenu TEXT,
      type VARCHAR(50) DEFAULT 'text',
      media_url VARCHAR(500),
      media_nom VARCHAR(500),
      reactions LONGTEXT,
      reponse_a VARCHAR(36),
      modifie TINYINT(1) DEFAULT 0,
      date_modification DATETIME,
      supprime_pour LONGTEXT,
      lu_par LONGTEXT,
      recu_par LONGTEXT,
      reply_to VARCHAR(36) DEFAULT NULL,
      forward_from VARCHAR(36) DEFAULT NULL,
      auteur_nom VARCHAR(255) DEFAULT '',
      media_taille INT DEFAULT NULL,
      localisation TEXT DEFAULT NULL,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Seed admin user if not exists
  const adminExists = await dbGet("SELECT id FROM users WHERE email = 'admin@harchive.local'");
  if (!adminExists) {
    const bcrypt = await import('bcrypt');
    const adminPwd = process.env.ADMIN_SEED_PASSWORD || 'change-me-immediately';
    const adminPasswordHash = await bcrypt.default.hash(adminPwd, 10);
    await dbRun(`
      INSERT IGNORE INTO users (id, username, email, password_hash, prenom, nom, role, role_archive, isRegistered)
      VALUES ('admin-001', 'admin@harchive.local', 'admin@harchive.local', ?, 'Admin', 'Systeme', 'admin_systeme', 'admin_systeme', 1)
    `, [adminPasswordHash]);
    logger.info('👤 Admin user seeded: admin@harchive.local (password from ADMIN_SEED_PASSWORD env)');
  }

  // Seed super admin LOUIS-QUATORZE KAZADI if not exists
  const superAdminExists = await dbGet("SELECT id FROM users WHERE id = 'superadmin-lqk-001'");
  if (!superAdminExists) {
    const bcryptSA = await import('bcrypt');
    const superPwd = process.env.SUPERADMIN_SEED_PASSWORD || 'change-me-immediately';
    const superAdminHash = await bcryptSA.default.hash(superPwd, 10);
    await dbRun(`
      INSERT IGNORE INTO users (id, username, email, password_hash, prenom, nom, role, role_archive, isRegistered)
      VALUES ('superadmin-lqk-001', 'louisquatorze.kazadi@harchive.local', 'louisquatorze.kazadi@harchive.local', ?, 'LOUIS-QUATORZE', 'KAZADI', 'super_admin', 'super_admin', 1)
    `, [superAdminHash]);
    logger.info('\u{1F451} Super Admin seeded: LOUIS-QUATORZE KAZADI / louisquatorze.kazadi@harchive.local');
  }

  logger.info('\u2705 Inscription tables created');
};

/**
 * Initialize database schema
 */
const initializeSchema = async () => {
  const usersExist = await tableExists('users');

  if (usersExist) {
    // ─── Migration path: tables already exist ───
    await createInscriptionTables();

    // Ensure users table has required columns
    const userCols = await getColumnNames('users');

    const colsToAdd = [
      ['email', "VARCHAR(255) DEFAULT ''"],
      ['password_hash', "VARCHAR(255) DEFAULT ''"],
      ['prenom', "VARCHAR(255) DEFAULT ''"],
      ['nom', "VARCHAR(255) DEFAULT ''"],
      ['etablissement_nom', "VARCHAR(255) DEFAULT ''"],
      ['etablissement_id', "VARCHAR(36) DEFAULT ''"],
      ['isRegistered', "TINYINT(1) DEFAULT 0"],
      ['journal_public', "TINYINT(1) DEFAULT 1"],
      ['journal_ouvert', "TINYINT(1) DEFAULT 1"],
      ['info_privacy', "LONGTEXT"],
      ['full_name', "VARCHAR(255) DEFAULT ''"],
      ['pays', "VARCHAR(100) DEFAULT ''"],
      ['bio', "TEXT"],
      ['titre_professionnel', "VARCHAR(255) DEFAULT ''"],
      ['headline', "VARCHAR(500) DEFAULT ''"],
      ['site_web', "VARCHAR(500) DEFAULT ''"],
      ['linkedin', "VARCHAR(500) DEFAULT ''"],
      ['twitter', "VARCHAR(500) DEFAULT ''"],
      ['facebook', "VARCHAR(500) DEFAULT ''"],
      ['instagram', "VARCHAR(500) DEFAULT ''"],
      ['github', "VARCHAR(500) DEFAULT ''"],
      ['competences', "LONGTEXT"],
      ['langues', "LONGTEXT"],
      ['centres_interet', "LONGTEXT"],
      ['experiences', "LONGTEXT"],
      ['formations', "LONGTEXT"],
      ['personne_urgence_nom', "VARCHAR(255) DEFAULT ''"],
      ['personne_urgence_telephone', "VARCHAR(50) DEFAULT ''"],
      ['personne_urgence_relation', "VARCHAR(100) DEFAULT ''"],
      ['photo_url', "VARCHAR(500) DEFAULT ''"],
      ['banner_url', "VARCHAR(500) DEFAULT ''"],
      ['post_nom', "VARCHAR(255) DEFAULT ''"],
      ['amis', "LONGTEXT"],
      ['classe_id', "VARCHAR(36) DEFAULT ''"],
      ['classe', "VARCHAR(255) DEFAULT ''"],
      ['faculte', "VARCHAR(255) DEFAULT ''"],
      ['departement', "VARCHAR(255) DEFAULT ''"],
      ['orientation', "VARCHAR(255) DEFAULT ''"],
      ['option_filiere', "VARCHAR(255) DEFAULT ''"],
      ['matricule', "VARCHAR(100) DEFAULT ''"],
      ['sexe', "VARCHAR(20) DEFAULT ''"],
      ['date_naissance', "VARCHAR(50) DEFAULT ''"],
      ['lieu_naissance', "VARCHAR(255) DEFAULT ''"],
      ['nationalite', "VARCHAR(100) DEFAULT ''"],
      ['etat_civil', "VARCHAR(50) DEFAULT ''"],
      ['telephone', "VARCHAR(50) DEFAULT ''"],
      ['adresse', "TEXT"],
      ['ville', "VARCHAR(255) DEFAULT ''"],
      ['province', "VARCHAR(255) DEFAULT ''"],
      ['nom_pere', "VARCHAR(255) DEFAULT ''"],
      ['nom_mere', "VARCHAR(255) DEFAULT ''"],
      ['province_affectation', "VARCHAR(255) DEFAULT ''"],
      ['blocked', "INT DEFAULT 0"],
      ['notification_prefs', "LONGTEXT DEFAULT NULL"],
    ];

    for (const [col, def] of colsToAdd) {
      if (!userCols.includes(col)) {
        await addColumnIfNotExists('users', col, def);
      }
    }

    // Backfill users with classe/faculte/etc. from their approved inscription_requests
    try {
      const usersToFix = await dbAll(
        `SELECT u.id, u.email FROM users u
         WHERE (u.classe IS NULL OR u.classe = '')
           AND u.role_archive IN ('etudiant','professeur')
           AND EXISTS (
             SELECT 1 FROM inscription_requests ir
             WHERE ir.email = u.email AND ir.statut = 'approuvee'
           )`
      );
      for (const u of usersToFix) {
        const ir = await dbGet(
          `SELECT classe, faculte, departement, orientation, option_filiere, matricule
           FROM inscription_requests WHERE email = ? AND statut = 'approuvee' LIMIT 1`,
          [u.email]
        );
        if (ir) {
          let classeId = '';
          if (ir.classe) {
            const promo = await dbGet(
              `SELECT id FROM promotions WHERE nom = ? LIMIT 1`,
              [ir.classe]
            );
            if (promo) classeId = promo.id;
          }
          await dbRun(
            `UPDATE users SET classe = ?, classe_id = ?, faculte = ?, departement = ?, orientation = ?, option_filiere = ?, matricule = COALESCE(NULLIF(matricule,''), ?) WHERE id = ?`,
            [ir.classe || '', classeId, ir.faculte || '', ir.departement || '', ir.orientation || '', ir.option_filiere || '', ir.matricule || '', u.id]
          );
          logger.warn(`🔨 Backfilled classe info for user ${u.email}`);
        }
      }
    } catch (e) {
      logger.warn('Backfill migration:', e.message);
    }

    // Backfill personal info from inscription_requests
    try {
      const usersToBackfill = await dbAll(
        `SELECT u.id, u.email FROM users u
         WHERE (u.sexe IS NULL OR u.sexe = '' OR u.date_naissance IS NULL OR u.date_naissance = '')
           AND u.role_archive IN ('etudiant','professeur')
           AND EXISTS (
             SELECT 1 FROM inscription_requests ir
             WHERE ir.email = u.email AND ir.statut = 'approuvee'
           )`
      );
      for (const u of usersToBackfill) {
        const ir = await dbGet(
          `SELECT post_nom, sexe, date_naissance, lieu_naissance, nationalite, etat_civil, telephone, adresse_candidat, nom_pere, nom_mere
           FROM inscription_requests WHERE email = ? AND statut = 'approuvee' LIMIT 1`,
          [u.email]
        );
        if (ir) {
          await dbRun(
            `UPDATE users SET
              post_nom = COALESCE(NULLIF(post_nom,''), ?),
              sexe = COALESCE(NULLIF(sexe,''), ?),
              date_naissance = COALESCE(NULLIF(date_naissance,''), ?),
              lieu_naissance = COALESCE(NULLIF(lieu_naissance,''), ?),
              nationalite = COALESCE(NULLIF(nationalite,''), ?),
              etat_civil = COALESCE(NULLIF(etat_civil,''), ?),
              telephone = COALESCE(NULLIF(telephone,''), ?),
              adresse = COALESCE(NULLIF(adresse,''), ?),
              nom_pere = COALESCE(NULLIF(nom_pere,''), ?),
              nom_mere = COALESCE(NULLIF(nom_mere,''), ?)
            WHERE id = ?`,
            [ir.post_nom || '', ir.sexe || '', ir.date_naissance || '', ir.lieu_naissance || '', ir.nationalite || '', ir.etat_civil || '', ir.telephone || '', ir.adresse_candidat || '', ir.nom_pere || '', ir.nom_mere || '', u.id]
          );
        }
      }
    } catch (e) {
      logger.warn('Backfill personal info:', e.message);
    }

    // Ensure all other tables exist
    await ensureAllTables();

    // Fix statut values
    await dbRun(`UPDATE inscription_requests SET statut = 'approuvee' WHERE statut = 'approuve'`);
    await dbRun(`UPDATE inscription_parents SET statut = 'approuvee' WHERE statut = 'approuve'`);
    await dbRun(`UPDATE inscription_etablissements SET statut = 'approuvee' WHERE statut = 'approuve'`);

    // Add missing columns to promotions
    for (const col of ['capacite', 'nombre_etudiants', 'faculte_nom', 'departement_nom', 'orientation_nom']) {
      const def = (col === 'capacite' || col === 'nombre_etudiants') ? 'INT DEFAULT 0' : 'VARCHAR(255)';
      await addColumnIfNotExists('promotions', col, def);
    }

    // Add province column to inscription_etablissements if missing
    await addColumnIfNotExists('inscription_etablissements', 'province', "VARCHAR(255) DEFAULT ''");

    // Add contact/address columns to etablissements_agrees if missing
    await addColumnIfNotExists('etablissements_agrees', 'adresse', "TEXT DEFAULT ''");
    await addColumnIfNotExists('etablissements_agrees', 'telephone', "VARCHAR(50) DEFAULT ''");
    await addColumnIfNotExists('etablissements_agrees', 'email_etablissement', "VARCHAR(255) DEFAULT ''");

    // Seed etablissements agrees data
    await addColumnIfNotExists('etablissements_agrees', 'categorie', "VARCHAR(100) DEFAULT ''");
    await seedEtablissementsAgrees(
      (sql, params) => dbRun(sql, params),
      (sql, params) => dbGet(sql, params)
    );

    // Promotion _nom sync
    try {
      await dbRun(`
        UPDATE promotions p
        INNER JOIN etablissement_departements ed ON ed.id = p.departement_id
        SET p.departement_nom = ed.nom
        WHERE p.departement_id != '' AND p.departement_id IS NOT NULL AND ed.nom != p.departement_nom
      `);
      await dbRun(`
        UPDATE promotions p
        INNER JOIN etablissement_facultes ef ON ef.id = p.faculte_id
        SET p.faculte_nom = ef.nom
        WHERE p.faculte_id != '' AND p.faculte_id IS NOT NULL AND ef.nom != p.faculte_nom
      `);
      logger.info('✅ Synced promotion _nom fields');
    } catch (e) {
      logger.warn('Promotion _nom sync:', e.message);
    }

    // Add contact/address columns to etablissements_agrees if missing
    await addColumnIfNotExists('etablissements_agrees', 'adresse', "TEXT DEFAULT ''");
    await addColumnIfNotExists('etablissements_agrees', 'telephone', "VARCHAR(50) DEFAULT ''");
    await addColumnIfNotExists('etablissements_agrees', 'email_etablissement', "VARCHAR(255) DEFAULT ''");

    // Backfill adresse/telephone/email from approved inscriptions into etablissements_agrees
    try {
      await dbRun(`
        UPDATE etablissements_agrees ea
        INNER JOIN inscription_etablissements ie
          ON ie.nom_etablissement = ea.denomination COLLATE utf8mb4_unicode_ci
          AND ie.statut = 'approuvee'
        SET
          ea.adresse = CASE WHEN (ea.adresse IS NULL OR ea.adresse = '') AND ie.adresse IS NOT NULL AND ie.adresse != '' THEN ie.adresse ELSE ea.adresse END,
          ea.telephone = CASE WHEN (ea.telephone IS NULL OR ea.telephone = '') AND ie.telephone IS NOT NULL AND ie.telephone != '' THEN ie.telephone ELSE ea.telephone END,
          ea.email_etablissement = CASE WHEN (ea.email_etablissement IS NULL OR ea.email_etablissement = '') AND ie.email_etablissement IS NOT NULL AND ie.email_etablissement != '' THEN ie.email_etablissement ELSE ea.email_etablissement END,
          ea.territoire = CASE WHEN (ea.territoire IS NULL OR ea.territoire = '') AND ie.ville IS NOT NULL AND ie.ville != '' THEN ie.ville ELSE ea.territoire END,
          ea.province = CASE WHEN (ea.province IS NULL OR ea.province = '') AND ie.province IS NOT NULL AND ie.province != '' THEN ie.province ELSE ea.province END
      `);
      logger.info('✅ Backfilled contact/address into etablissements_agrees');
    } catch (e) {
      logger.warn('Backfill etablissements_agrees contact:', e.message);
    }

    logger.warn('📦 Schema already initialized (migration done)');

    // Ensure new columns are present on existing tables
    await addColumnIfNotExists('publications', 'masque', 'TINYINT(1) DEFAULT 0');
    await addColumnIfNotExists('publications', 'epingle', 'TINYINT(1) DEFAULT 0');

    return;
  }

  // ─── Fresh install: create all tables ───
  logger.info('🔨 Initializing database schema...');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      prenom VARCHAR(255),
      nom VARCHAR(255),
      role VARCHAR(50) DEFAULT 'etudiant',
      role_archive VARCHAR(50) DEFAULT 'etudiant',
      etablissement_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      photo_url VARCHAR(500) DEFAULT '',
      banner_url VARCHAR(500) DEFAULT '',
      post_nom VARCHAR(255) DEFAULT '',
      amis LONGTEXT,
      classe_id VARCHAR(36) DEFAULT '',
      journal_public TINYINT(1) DEFAULT 1,
      journal_ouvert TINYINT(1) DEFAULT 1,
      info_privacy LONGTEXT,
      isRegistered TINYINT(1) DEFAULT 0,
      blocked INT DEFAULT 0,
      full_name VARCHAR(255) DEFAULT '',
      pays VARCHAR(100) DEFAULT '',
      bio TEXT,
      titre_professionnel VARCHAR(255) DEFAULT '',
      headline VARCHAR(500) DEFAULT '',
      site_web VARCHAR(500) DEFAULT '',
      linkedin VARCHAR(500) DEFAULT '',
      twitter VARCHAR(500) DEFAULT '',
      facebook VARCHAR(500) DEFAULT '',
      instagram VARCHAR(500) DEFAULT '',
      github VARCHAR(500) DEFAULT '',
      competences LONGTEXT,
      langues LONGTEXT,
      centres_interet LONGTEXT,
      experiences LONGTEXT,
      formations LONGTEXT,
      personne_urgence_nom VARCHAR(255) DEFAULT '',
      personne_urgence_telephone VARCHAR(50) DEFAULT '',
      personne_urgence_relation VARCHAR(100) DEFAULT '',
      classe VARCHAR(255) DEFAULT '',
      faculte VARCHAR(255) DEFAULT '',
      departement VARCHAR(255) DEFAULT '',
      orientation VARCHAR(255) DEFAULT '',
      option_filiere VARCHAR(255) DEFAULT '',
      matricule VARCHAR(100) DEFAULT '',
      sexe VARCHAR(20) DEFAULT '',
      date_naissance VARCHAR(50) DEFAULT '',
      lieu_naissance VARCHAR(255) DEFAULT '',
      nationalite VARCHAR(100) DEFAULT '',
      etat_civil VARCHAR(50) DEFAULT '',
      telephone VARCHAR(50) DEFAULT '',
      adresse TEXT,
      ville VARCHAR(255) DEFAULT '',
      province VARCHAR(255) DEFAULT '',
      nom_pere VARCHAR(255) DEFAULT '',
      nom_mere VARCHAR(255) DEFAULT '',
      province_affectation VARCHAR(255) DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS publications (
      id VARCHAR(36) PRIMARY KEY,
      auteur_id VARCHAR(36) NOT NULL,
      auteur_nom VARCHAR(255),
      auteur_photo_url VARCHAR(500) DEFAULT '',
      auteur_role VARCHAR(50) DEFAULT '',
      contenu TEXT,
      type_media VARCHAR(50),
      media_url VARCHAR(500),
      visibilite VARCHAR(50) DEFAULT 'publique',
      visible_to LONGTEXT,
      etablissement_id VARCHAR(36),
      classe_id VARCHAR(36),
      cible_profil_id VARCHAR(36),
      likes LONGTEXT,
      nb_commentaires INT DEFAULT 0,
      commentaires LONGTEXT,
      masque TINYINT(1) DEFAULT 0,
      epingle TINYINT(1) DEFAULT 0,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (auteur_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS commentaires (
      id VARCHAR(36) PRIMARY KEY,
      publication_id VARCHAR(36) NOT NULL,
      auteur_id VARCHAR(36) NOT NULL,
      auteur_nom VARCHAR(255),
      auteur_role VARCHAR(50),
      auteur_photo_url VARCHAR(500),
      contenu TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (publication_id) REFERENCES publications(id),
      FOREIGN KEY (auteur_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add masque/epingle columns to existing publications table
  await addColumnIfNotExists('publications', 'masque', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('publications', 'epingle', 'TINYINT(1) DEFAULT 0');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS photos (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(255),
      description TEXT,
      image_url VARCHAR(500),
      album VARCHAR(255) DEFAULT 'Sans album',
      visibilite VARCHAR(50) DEFAULT 'privee',
      likes LONGTEXT,
      created_by VARCHAR(36),
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS establishments (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE,
      address TEXT,
      city VARCHAR(255),
      country VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      website VARCHAR(500),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS etablissements_agrees (
      id VARCHAR(36) PRIMARY KEY,
      sigle VARCHAR(50),
      denomination VARCHAR(500),
      statut VARCHAR(50),
      territoire VARCHAR(255),
      province VARCHAR(255),
      etat VARCHAR(100),
      type VARCHAR(100),
      ordre INT DEFAULT 0,
      categorie VARCHAR(100) DEFAULT '',
      adresse TEXT DEFAULT '',
      telephone VARCHAR(50) DEFAULT '',
      email_etablissement VARCHAR(255) DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE,
      establishmentId VARCHAR(36),
      niveau VARCHAR(100),
      description TEXT,
      capacity INT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (establishmentId) REFERENCES establishments(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS matieres (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      coefficient INT DEFAULT 1,
      nombre_heures INT DEFAULT 0,
      couleur VARCHAR(20) DEFAULT '#1e40af',
      niveaux LONGTEXT,
      faculte VARCHAR(255),
      etablissement_id VARCHAR(36),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS assignation_professeurs (
      id VARCHAR(36) PRIMARY KEY,
      professeur_id VARCHAR(36) NOT NULL,
      professeur_nom VARCHAR(255),
      professeur_email VARCHAR(255),
      faculte VARCHAR(255),
      departement VARCHAR(255),
      \`option\` VARCHAR(255),
      orientation VARCHAR(255),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      etablissement_id VARCHAR(36) NOT NULL,
      annee_scolaire VARCHAR(50),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) UNIQUE,
      matricule VARCHAR(100) UNIQUE,
      level VARCHAR(100),
      classId VARCHAR(36),
      establishmentId VARCHAR(36),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (classId) REFERENCES classes(id),
      FOREIGN KEY (establishmentId) REFERENCES establishments(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Structure Académique tables
  await dbRun(`
    CREATE TABLE IF NOT EXISTS etablissement_facultes (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      etablissement_id VARCHAR(36) NOT NULL,
      etablissement_nom VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS etablissement_departements (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      faculte_id VARCHAR(36),
      faculte_nom VARCHAR(255),
      etablissement_id VARCHAR(36) NOT NULL,
      etablissement_nom VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS etablissement_orientations (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      departement_id VARCHAR(36),
      departement_nom VARCHAR(255),
      faculte_id VARCHAR(36),
      etablissement_id VARCHAR(36) NOT NULL,
      etablissement_nom VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS etablissement_options (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      departement_id VARCHAR(36),
      departement_nom VARCHAR(255),
      orientation_id VARCHAR(36),
      orientation_nom VARCHAR(255),
      faculte_id VARCHAR(36),
      etablissement_id VARCHAR(36) NOT NULL,
      etablissement_nom VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS promotions (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      description TEXT,
      annee_academique VARCHAR(50),
      niveau VARCHAR(100),
      capacite INT DEFAULT 0,
      nombre_etudiants INT DEFAULT 0,
      option_id VARCHAR(36),
      option_nom VARCHAR(255),
      orientation_id VARCHAR(36),
      orientation_nom VARCHAR(255),
      departement_id VARCHAR(36),
      departement_nom VARCHAR(255),
      faculte_id VARCHAR(36),
      faculte_nom VARCHAR(255),
      etablissement_id VARCHAR(36) NOT NULL,
      etablissement_nom VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Registration tables + seeds
  await createInscriptionTables();

  // All auxiliary tables
  await ensureAllTables();

  // Seed etablissements agrees data
  await addColumnIfNotExists('etablissements_agrees', 'categorie', "VARCHAR(100) DEFAULT ''");
  await seedEtablissementsAgrees(
    (sql, params) => dbRun(sql, params),
    (sql, params) => dbGet(sql, params)
  );

  logger.info('✅ Schema initialized');
};

/**
 * Create all auxiliary tables
 */
async function ensureAllTables() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS calendrier_academique (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500),
      type VARCHAR(50) DEFAULT 'cours',
      etablissement_id VARCHAR(36),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      date_debut VARCHAR(50),
      date_fin VARCHAR(50),
      heure_debut VARCHAR(20),
      heure_fin VARCHAR(20),
      salle VARCHAR(255),
      couleur VARCHAR(20) DEFAULT '#3b82f6',
      annee_scolaire VARCHAR(50),
      statut_publication VARCHAR(50) DEFAULT 'brouillon',
      faculte VARCHAR(255),
      departement VARCHAR(255),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS instruction_cours (
      id VARCHAR(36) PRIMARY KEY,
      etablissement_id VARCHAR(36),
      classe_id VARCHAR(36),
      matiere_id VARCHAR(36),
      type VARCHAR(50) DEFAULT 'instruction',
      titre VARCHAR(500),
      contenu LONGTEXT,
      date_cours VARCHAR(50),
      important TINYINT(1) DEFAULT 0,
      statut_publication VARCHAR(50) DEFAULT 'brouillon',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS liste_presence (
      id VARCHAR(36) PRIMARY KEY,
      calendrier_id VARCHAR(36),
      date VARCHAR(50),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      faculte VARCHAR(255),
      departement VARCHAR(255),
      \`option\` VARCHAR(255),
      orientation VARCHAR(255),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      etablissement_nom VARCHAR(255),
      heure_debut VARCHAR(20),
      heure_fin VARCHAR(20),
      salle VARCHAR(255),
      presences LONGTEXT,
      total_etudiants INT DEFAULT 0,
      total_presents INT DEFAULT 0,
      total_absents INT DEFAULT 0,
      total_retards INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS presences (
      id VARCHAR(36) PRIMARY KEY,
      etudiant_id VARCHAR(36),
      etudiant_nom VARCHAR(255),
      classe_id VARCHAR(36),
      matiere_id VARCHAR(36),
      professeur_id VARCHAR(36),
      etablissement_id VARCHAR(36),
      date VARCHAR(50),
      heure_debut VARCHAR(20),
      heure_fin VARCHAR(20),
      statut VARCHAR(50) DEFAULT 'absent',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS notes_etudiants (
      id VARCHAR(36) PRIMARY KEY,
      etudiant_id VARCHAR(36),
      etudiant_nom VARCHAR(255),
      etudiant_matricule VARCHAR(100),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      periode VARCHAR(100),
      annee_scolaire VARCHAR(50),
      type_evaluation VARCHAR(100),
      titre_evaluation VARCHAR(255),
      note FLOAT,
      note_sur FLOAT,
      pourcentage FLOAT,
      date_evaluation VARCHAR(50),
      statut VARCHAR(50) DEFAULT 'brouillon',
      visible_etudiant TINYINT(1) DEFAULT 0,
      visible_parent TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS notes_archive (
      id VARCHAR(36) PRIMARY KEY,
      source_note_id VARCHAR(36),
      etudiant_id VARCHAR(36),
      etudiant_nom VARCHAR(255),
      etudiant_matricule VARCHAR(100),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      periode VARCHAR(100),
      annee_scolaire VARCHAR(50),
      type_evaluation VARCHAR(100),
      titre_evaluation VARCHAR(255),
      note FLOAT,
      note_sur FLOAT,
      pourcentage FLOAT,
      date_evaluation VARCHAR(50),
      statut VARCHAR(50),
      archived_at DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id VARCHAR(36) PRIMARY KEY,
      blocker_id VARCHAR(36) NOT NULL,
      blocked_id VARCHAR(36) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS nsfw_violations (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      user_nom VARCHAR(255) DEFAULT '',
      user_email VARCHAR(255) DEFAULT '',
      filename VARCHAR(500) DEFAULT '',
      reason VARCHAR(500) DEFAULT '',
      category VARCHAR(50) DEFAULT '',
      scores TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nsfw_user (user_id),
      INDEX idx_nsfw_date (created_date DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS auto_blocked_accounts (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      user_nom VARCHAR(255) DEFAULT '',
      user_email VARCHAR(255) DEFAULT '',
      user_role VARCHAR(50) DEFAULT '',
      violation_count INT DEFAULT 3,
      reason VARCHAR(500) DEFAULT 'Tentatives répétées de publication de contenu pornographique',
      status VARCHAR(20) DEFAULT 'blocked',
      reviewed_by VARCHAR(36) DEFAULT NULL,
      reviewed_at DATETIME DEFAULT NULL,
      review_action VARCHAR(20) DEFAULT NULL,
      review_note TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_autoblock_user (user_id),
      INDEX idx_autoblock_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS blocked_messages (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      sender_type ENUM('user','admin') NOT NULL,
      sender_id VARCHAR(36) NOT NULL,
      sender_name VARCHAR(255) DEFAULT '',
      message TEXT NOT NULL,
      read_by_admin TINYINT DEFAULT 0,
      read_by_user TINYINT DEFAULT 0,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_bm_user (user_id),
      INDEX idx_bm_date (created_date DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS \`groups\` (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) DEFAULT 'public',
      admin_id VARCHAR(36),
      admin_name VARCHAR(255),
      members LONGTEXT,
      members_details LONGTEXT,
      demandes_adhesion LONGTEXT,
      avatar_url VARCHAR(500),
      message_bienvenue TEXT,
      dernier_message TEXT,
      dernier_message_date DATETIME,
      dernier_message_auteur VARCHAR(36),
      fichiers_partages LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id VARCHAR(36) PRIMARY KEY,
      group_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(36),
      sender_name VARCHAR(255),
      contenu TEXT,
      type VARCHAR(50) DEFAULT 'texte',
      media_url VARCHAR(500),
      media_nom VARCHAR(500),
      media_taille INT,
      reactions LONGTEXT,
      lu_par LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS dossiers_inscription (
      id VARCHAR(36) PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      fichier_type VARCHAR(100),
      fichier_url LONGTEXT,
      chemin LONGTEXT,
      is_fichier TINYINT(1) DEFAULT 0,
      parent_id VARCHAR(36),
      etudiant_id VARCHAR(36),
      etudiant_nom VARCHAR(255),
      etudiant_email VARCHAR(255),
      etablissement_id VARCHAR(36),
      etablissement_nom VARCHAR(255) DEFAULT '',
      certifie TINYINT(1) DEFAULT 0,
      certifie_par VARCHAR(36),
      date_certification DATETIME,
      pre_certification TINYINT(1) DEFAULT 0,
      masque TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS canaux_renvoi (
      id VARCHAR(36) PRIMARY KEY,
      demande_id VARCHAR(36),
      etudiant_email VARCHAR(255),
      etudiant_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      admin_email VARCHAR(255),
      admin_nom VARCHAR(255),
      type_fichier VARCHAR(100),
      motif_rejet TEXT,
      statut VARCHAR(50) DEFAULT 'ouvert',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS fiches_preparation (
      id VARCHAR(36) PRIMARY KEY,
      numero_identification VARCHAR(255),
      titre_seance VARCHAR(500),
      date_seance VARCHAR(50),
      duree_seance VARCHAR(50),
      filiere VARCHAR(255),
      annee VARCHAR(50),
      groupe VARCHAR(255),
      module VARCHAR(255),
      objectifs_seance TEXT,
      espace_formation VARCHAR(255),
      remarques TEXT,
      classe_id VARCHAR(36),
      matiere_id VARCHAR(36),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      introduction LONGTEXT,
      developpement LONGTEXT,
      conclusion LONGTEXT,
      evaluation LONGTEXT,
      transmise_admin TINYINT(1) DEFAULT 0,
      masque_par_admin TINYINT(1) DEFAULT 0,
      masque_par_professeur TINYINT(1) DEFAULT 0,
      approuvee_admin TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS questionnaires_examen (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500),
      numero_identification VARCHAR(255),
      type_evaluation VARCHAR(100),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      date_examen VARCHAR(50),
      duree VARCHAR(50),
      bareme_total VARCHAR(50),
      consignes TEXT,
      fichier_url LONGTEXT,
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      transmis_admin TINYINT(1) DEFAULT 0,
      masque_par_admin TINYINT(1) DEFAULT 0,
      masque_par_professeur TINYINT(1) DEFAULT 0,
      approuve_admin TINYINT(1) DEFAULT 0,
      contenu_questions LONGTEXT,
      date_approbation VARCHAR(50) DEFAULT '',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS ressources_pedagogiques (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500),
      description TEXT,
      type VARCHAR(50) DEFAULT 'document',
      matiere_id VARCHAR(36),
      niveau VARCHAR(100),
      competences LONGTEXT,
      tags LONGTEXT,
      public TINYINT(1) DEFAULT 0,
      fichier_url LONGTEXT,
      lien_externe VARCHAR(500),
      vignette_url VARCHAR(500),
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      nombre_utilisations INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sequences_pedagogiques (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500),
      description TEXT,
      objectifs LONGTEXT,
      matiere_id VARCHAR(36),
      matiere_nom VARCHAR(255),
      classe_id VARCHAR(36),
      classe_nom VARCHAR(255),
      date_debut VARCHAR(50),
      date_fin VARCHAR(50),
      statut VARCHAR(50) DEFAULT 'brouillon',
      professeur_id VARCHAR(36),
      professeur_nom VARCHAR(255),
      etablissement_id VARCHAR(36),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ─── Live Streams ───
  await dbRun(`
    CREATE TABLE IF NOT EXISTS live_streams (
      id VARCHAR(36) PRIMARY KEY,
      streamer_id VARCHAR(36) NOT NULL,
      streamer_nom VARCHAR(255),
      streamer_photo_url VARCHAR(500) DEFAULT '',
      titre VARCHAR(500) NOT NULL,
      description TEXT,
      thumbnail_url VARCHAR(500),
      status ENUM('live','ended') DEFAULT 'live',
      viewer_count INT DEFAULT 0,
      peak_viewers INT DEFAULT 0,
      total_likes INT DEFAULT 0,
      total_reactions LONGTEXT,
      recording_url VARCHAR(500),
      duration INT DEFAULT 0,
      tags LONGTEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (streamer_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS live_chat_messages (
      id VARCHAR(36) PRIMARY KEY,
      stream_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      user_nom VARCHAR(255),
      user_photo_url VARCHAR(500) DEFAULT '',
      message TEXT NOT NULL,
      type ENUM('message','reaction','system') DEFAULT 'message',
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ─── Short Videos ───
  await dbRun(`
    CREATE TABLE IF NOT EXISTS short_videos (
      id VARCHAR(36) PRIMARY KEY,
      creator_id VARCHAR(36) NOT NULL,
      creator_nom VARCHAR(255),
      creator_photo_url VARCHAR(500) DEFAULT '',
      titre VARCHAR(500),
      description TEXT,
      video_url VARCHAR(500) NOT NULL,
      thumbnail_url VARCHAR(500),
      duration FLOAT DEFAULT 0,
      width INT DEFAULT 0,
      height INT DEFAULT 0,
      views INT DEFAULT 0,
      likes LONGTEXT,
      nb_commentaires INT DEFAULT 0,
      tags LONGTEXT,
      music_name VARCHAR(255),
      music_artist VARCHAR(255),
      is_from_live TINYINT(1) DEFAULT 0,
      source_live_id VARCHAR(36),
      visibilite VARCHAR(50) DEFAULT 'publique',
      status ENUM('processing','published','deleted') DEFAULT 'published',
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS short_comments (
      id VARCHAR(36) PRIMARY KEY,
      short_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      user_nom VARCHAR(255),
      user_photo_url VARCHAR(500) DEFAULT '',
      contenu TEXT NOT NULL,
      likes LONGTEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (short_id) REFERENCES short_videos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Bibliothèque numérique ──
  await dbRun(`
    CREATE TABLE IF NOT EXISTS livres (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500) NOT NULL,
      auteur VARCHAR(255) NOT NULL,
      description TEXT,
      categorie VARCHAR(100) DEFAULT 'Roman',
      isbn VARCHAR(50),
      annee_publication INT,
      editeur VARCHAR(255),
      langue VARCHAR(50) DEFAULT 'Français',
      nombre_pages INT,
      couverture_url VARCHAR(1000) DEFAULT '',
      fichier_pdf_url VARCHAR(1000) DEFAULT '',
      disponible TINYINT(1) DEFAULT 1,
      tags LONGTEXT,
      nombre_consultations INT DEFAULT 0,
      nombre_telechargements INT DEFAULT 0,
      created_by VARCHAR(36),
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Travaux académiques (mémoires, recherches, publications étudiantes/professeurs) ──
  await dbRun(`
    CREATE TABLE IF NOT EXISTS travaux_academiques (
      id VARCHAR(36) PRIMARY KEY,
      titre VARCHAR(500) NOT NULL,
      auteur VARCHAR(255) NOT NULL,
      type_travail VARCHAR(100) DEFAULT 'Mémoire',
      discipline VARCHAR(255) DEFAULT '',
      resume TEXT,
      mots_cles LONGTEXT,
      annee INT,
      etablissement VARCHAR(255) DEFAULT '',
      directeur_recherche VARCHAR(255) DEFAULT '',
      niveau VARCHAR(100) DEFAULT '',
      couverture_url VARCHAR(1000) DEFAULT '',
      fichier_pdf_url VARCHAR(1000) DEFAULT '',
      nombre_pages INT,
      nombre_consultations INT DEFAULT 0,
      statut VARCHAR(50) DEFAULT 'publié',
      created_by VARCHAR(36),
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Commentaires livres ──
  await dbRun(`
    CREATE TABLE IF NOT EXISTS commentaires_livres (
      id VARCHAR(36) PRIMARY KEY,
      livre_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      user_nom VARCHAR(255),
      user_photo_url VARCHAR(500) DEFAULT '',
      contenu TEXT NOT NULL,
      note INT DEFAULT 0,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (livre_id) REFERENCES livres(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Commentaires travaux académiques ──
  await dbRun(`
    CREATE TABLE IF NOT EXISTS commentaires_travaux (
      id VARCHAR(36) PRIMARY KEY,
      travail_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      user_nom VARCHAR(255),
      user_photo_url VARCHAR(500) DEFAULT '',
      contenu TEXT NOT NULL,
      note INT DEFAULT 0,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (travail_id) REFERENCES travaux_academiques(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  logger.info('📦 All auxiliary tables ensured');
}

/**
 * Exported utilities for queries — same interface as before
 */
export const dbUtils = {
  run: (sql, params) => dbRun(sql, params),
  all: (sql, params) => dbAll(sql, params),
  get: (sql, params) => dbGet(sql, params),
};

export default { initializeDatabase, getDatabase, dbUtils };
