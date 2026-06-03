/**
 * Authentication Controller
 * Handles login, signup, registration with admin approval
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { generateToken, generateRefreshToken, setTokenCookie, clearTokenCookie } from '../middleware/auth.js';
import { dbUtils } from '../db/database.js';
import { sendVerificationCode, generateCode } from '../services/emailService.js';

import logger from '../utils/logger.js';

const SALT_ROUNDS = 10;

/**
 * In-memory login attempt tracker (per email).
 * Tracks failed attempts count and lockout time.
 */
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const checkLoginThrottle = (email) => {
  const record = loginAttempts.get(email);
  if (!record) return null;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return `Trop de tentatives. Réessayez dans ${minutesLeft} minute(s).`;
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginAttempts.delete(email);
  }
  return null;
};

const recordFailedLogin = (email) => {
  const record = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    record.count = 0;
  }
  loginAttempts.set(email, record);
};

const clearFailedLogins = (email) => {
  loginAttempts.delete(email);
};

/**
 * Validate password strength: min 8 chars, at least one uppercase, one lowercase, one digit
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule';
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre';
  return null;
};

/**
 * Register - Submit inscription request (étudiant/professeur)
 * Does NOT create a user account - creates a pending request
 */
export const register = async (req, res) => {
  try {
    const { email, password, ...formData } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email et mot de passe requis' });
    }

    // Check email was verified
    const verified = await dbUtils.get(
      `SELECT id FROM email_verifications WHERE email = ? AND verified = 1 AND expires_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY createdAt DESC LIMIT 1`,
      [email]
    );
    if (!verified) {
      return res.status(400).json({ status: 400, message: 'Veuillez vérifier votre email avant de soumettre le formulaire.' });
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      return res.status(400).json({ status: 400, message: pwdError });
    }

    const existingUser = await dbUtils.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'Un compte avec cet email existe déjà' });
    }

    const existingRequest = await dbUtils.get(
      "SELECT id FROM inscription_requests WHERE email = ? AND statut = 'en_attente'", [email]
    );
    if (existingRequest) {
      return res.status(409).json({ status: 409, message: "Une demande avec cet email est déjà en attente d'approbation" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    await dbUtils.run(
      `INSERT INTO inscription_requests (
        id, type_utilisateur, nom, post_nom, prenom, email, password_hash,
        telephone, sexe, nationalite, etat_civil, date_naissance, lieu_naissance,
        matricule, nom_pere, nom_mere, province_origine, district, territoire,
        adresse_candidat, ecole_secondaire, adresse_ecole, centre_exetat,
        section_secondaire, annee_secondaire, pourcentage_obtenu,
        numero_diplome_secondaire, annee_obtention_diplome, numero_diplome,
        specialite, etablissement_nom, etablissement_id, faculte, departement,
        orientation, option_filiere, "option", classe,
        piece_jointe_diplome, piece_jointe_bulletin, piece_jointe_bulletin_2,
        piece_jointe_attestation_naissance, piece_jointe_bonne_vie,
        statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, 'en_attente')`,
      [
        id,
        formData.type_utilisateur || 'etudiant',
        formData.nom || '', formData.post_nom || '', formData.prenom || '',
        email, passwordHash,
        formData.telephone || '', formData.sexe || '', formData.nationalite || '',
        formData.etat_civil || '', formData.date_naissance || '', formData.lieu_naissance || '',
        formData.matricule || '', formData.nom_pere || '', formData.nom_mere || '',
        formData.province_origine || '', formData.district || '', formData.territoire || '',
        formData.adresse_candidat || '', formData.ecole_secondaire || '', formData.adresse_ecole || '',
        formData.centre_exetat || '', formData.section_secondaire || '', formData.annee_secondaire || '',
        formData.pourcentage_obtenu || '', formData.numero_diplome_secondaire || '',
        formData.annee_obtention_diplome || '', formData.numero_diplome || '',
        formData.specialite || '', formData.etablissement_nom || '', formData.etablissement_id || '',
        formData.faculte || '', formData.departement || '',
        formData.orientation || '', formData.option || '', formData.option || '', formData.classe || '',
        formData.piece_jointe_diplome || '', formData.piece_jointe_bulletin || '',
        formData.piece_jointe_bulletin_2 || '',
        formData.piece_jointe_attestation_naissance || '', formData.piece_jointe_bonne_vie || '',
      ]
    );

    // Notify all admin_systeme users
    try {
      const admins = await dbUtils.all("SELECT id FROM users WHERE role_archive = 'admin_systeme' OR role_archive = 'super_admin'", []);
      const nomComplet = `${formData.nom || ''} ${formData.prenom || ''}`.trim() || email;
      const typeUtil = formData.type_utilisateur || 'étudiant';
      for (const admin of admins) {
        await dbUtils.run(
          `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lien, lue)
           VALUES (?, ?, 'inscription', ?, ?, '/gestioninscriptions', 0)`,
          [uuidv4(), admin.id, "Nouvelle demande d'inscription", `${nomComplet} souhaite s'inscrire en tant que ${typeUtil}`]
        );
      }
    } catch (e) { /* silent - do not block registration */ }

    res.status(201).json({
      status: 201,
      message: "Demande d'inscription soumise avec succès. En attente d'approbation.",
      data: { id, email, statut: 'en_attente' }
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ status: 500, message: "Erreur lors de l'inscription" });
  }
};

/**
 * Register Parent
 */
export const registerParent = async (req, res) => {
  try {
    const { email, password, ...formData } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email et mot de passe requis' });
    }

    // Check email was verified
    const verified = await dbUtils.get(
      `SELECT id FROM email_verifications WHERE email = ? AND verified = 1 AND expires_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY createdAt DESC LIMIT 1`,
      [email]
    );
    if (!verified) {
      return res.status(400).json({ status: 400, message: 'Veuillez vérifier votre email avant de soumettre le formulaire.' });
    }

    const pwdError2 = validatePassword(password);
    if (pwdError2) {
      return res.status(400).json({ status: 400, message: pwdError2 });
    }

    const existingUser = await dbUtils.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'Un compte avec cet email existe déjà' });
    }
    const existingRequest = await dbUtils.get(
      "SELECT id FROM inscription_parents WHERE email = ? AND statut = 'en_attente'", [email]
    );
    if (existingRequest) {
      return res.status(409).json({ status: 409, message: 'Une demande avec cet email est déjà en attente' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    await dbUtils.run(
      `INSERT INTO inscription_parents (
        id, nom, post_nom, prenom, email, password_hash, telephone, adresse,
        nom_enfant, matricule_enfant, etablissement_nom, enfants_supplementaires, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
      [
        id, formData.nom || '', formData.post_nom || '', formData.prenom || '',
        email, passwordHash, formData.telephone || '', formData.adresse || '',
        formData.nom_enfant || '', formData.matricule_enfant || '',
        formData.etablissement_nom || '', formData.enfants_supplementaires || '',
      ]
    );
    // Notify all admin_systeme users
    try {
      const admins = await dbUtils.all("SELECT id FROM users WHERE role_archive = 'admin_systeme' OR role_archive = 'super_admin'", []);
      const nomComplet = `${formData.nom || ''} ${formData.prenom || ''}`.trim() || email;
      for (const admin of admins) {
        await dbUtils.run(
          `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lien, lue)
           VALUES (?, ?, 'inscription', ?, ?, '/gestioninscriptions', 0)`,
          [uuidv4(), admin.id, "Nouvelle demande d'inscription parent", `${nomComplet} souhaite s'inscrire en tant que parent`]
        );
      }
    } catch (e) { /* silent - do not block registration */ }
    res.status(201).json({
      status: 201,
      message: "Demande d'inscription parent soumise. En attente d'approbation.",
      data: { id, email, statut: 'en_attente' }
    });
  } catch (error) {
    logger.error('Register parent error:', error);
    res.status(500).json({ status: 500, message: "Erreur lors de l'inscription" });
  }
};

/**
 * Register Establishment
 */
export const registerEtablissement = async (req, res) => {
  try {
    const { password, ...formData } = req.body;
    const email = formData.email_responsable;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email du responsable et mot de passe requis' });
    }

    // Check email was verified
    const verified = await dbUtils.get(
      `SELECT id FROM email_verifications WHERE email = ? AND verified = 1 AND expires_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY createdAt DESC LIMIT 1`,
      [email]
    );
    if (!verified) {
      return res.status(400).json({ status: 400, message: 'Veuillez vérifier votre email avant de soumettre le formulaire.' });
    }

    const pwdError3 = validatePassword(password);
    if (pwdError3) {
      return res.status(400).json({ status: 400, message: pwdError3 });
    }

    const existingUser = await dbUtils.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'Un compte avec cet email existe déjà' });
    }
    const existingRequest = await dbUtils.get(
      "SELECT id FROM inscription_etablissements WHERE email_responsable = ? AND statut = 'en_attente'", [email]
    );
    if (existingRequest) {
      return res.status(409).json({ status: 409, message: 'Une demande avec cet email est déjà en attente' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    await dbUtils.run(
      `INSERT INTO inscription_etablissements (
        id, nom_etablissement, code_etablissement, type, adresse, ville, telephone,
        email_etablissement, nom_responsable, prenom_responsable, email_responsable,
        password_hash, telephone_responsable, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
      [
        id, formData.nom_etablissement || '', formData.code_etablissement || '',
        formData.type || 'universite', formData.adresse || '', formData.ville || '',
        formData.telephone || '', formData.email_etablissement || '',
        formData.nom_responsable || '', formData.prenom_responsable || '',
        email, passwordHash, formData.telephone_responsable || '',
      ]
    );

    // Notify all admin_systeme and super_admin users
    try {
      const admins = await dbUtils.all("SELECT id FROM users WHERE role_archive = 'admin_systeme' OR role_archive = 'super_admin'", []);
      const nomEtab = formData.nom_etablissement || email;
      const nomResp = `${formData.nom_responsable || ''} ${formData.prenom_responsable || ''}`.trim();
      for (const admin of admins) {
        await dbUtils.run(
          `INSERT INTO notifications (id, destinataire_id, type, titre, contenu, lien, lue)
           VALUES (?, ?, 'inscription', ?, ?, '/gestioninscriptions', 0)`,
          [uuidv4(), admin.id, "Nouvelle demande d'inscription établissement", `${nomEtab} - Responsable: ${nomResp}`]
        );
      }
    } catch (e) { /* silent - do not block registration */ }

    res.status(201).json({
      status: 201,
      message: "Demande d'inscription établissement soumise. En attente d'approbation.",
      data: { id, email, statut: 'en_attente' }
    });
  } catch (error) {
    logger.error('Register etablissement error:', error);
    res.status(500).json({ status: 500, message: "Erreur lors de l'inscription" });
  }
};

/**
 * Login - Authenticate user with email & password
 * Only approved users can login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 400, message: 'Email et mot de passe requis' });
    }

    // Per-email throttle check
    const throttleMsg = checkLoginThrottle(email);
    if (throttleMsg) {
      return res.status(429).json({ status: 429, message: throttleMsg });
    }

    const user = await dbUtils.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      recordFailedLogin(email);
      // Check for pending requests
      const pendingRequest = await dbUtils.get(
        "SELECT id FROM inscription_requests WHERE email = ? AND statut = 'en_attente'", [email]
      );
      const pendingParent = await dbUtils.get(
        "SELECT id FROM inscription_parents WHERE email = ? AND statut = 'en_attente'", [email]
      );
      const pendingEtab = await dbUtils.get(
        "SELECT id FROM inscription_etablissements WHERE email_responsable = ? AND statut = 'en_attente'", [email]
      );

      if (pendingRequest || pendingParent || pendingEtab) {
        return res.status(403).json({
          status: 403,
          message: "Votre demande d'inscription est en attente d'approbation par un administrateur."
        });
      }

      return res.status(401).json({ status: 401, message: 'Email ou mot de passe incorrect' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash || user.password);
    if (!passwordValid) {
      recordFailedLogin(email);
      return res.status(401).json({ status: 401, message: 'Email ou mot de passe incorrect' });
    }

    // Successful login — clear throttle
    clearFailedLogins(email);

    const token = generateToken(user.id, {
      email: user.email,
      role: user.role,
      role_archive: user.role_archive,
    });
    const refreshToken = generateRefreshToken(user.id);

    // Set HttpOnly cookies (access + refresh)
    setTokenCookie(res, token, refreshToken);

    res.json({
      status: 200,
      message: user.blocked ? 'Compte bloqué' : 'Connexion réussie',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        prenom: user.prenom,
        nom: user.nom,
        post_nom: user.post_nom || '',
        full_name: `${user.prenom || ''} ${user.nom || ''}`.trim(),
        role: user.role,
        role_archive: user.role_archive,
        etablissement_nom: user.etablissement_nom || '',
        etablissement_id: user.etablissement_id || '',
        classe_id: user.classe_id || '',
        photo_url: user.photo_url || '',
        banner_url: user.banner_url || '',
        amis: user.amis || '[]',
        journal_public: user.journal_public,
        journal_ouvert: user.journal_ouvert,
        blocked: user.blocked ? 1 : 0,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ status: 500, message: 'Erreur de connexion' });
  }
};

/**
 * Refresh access token using refresh cookie
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshTokenValue = req.cookies?.harchive_refresh;
    if (!refreshTokenValue) {
      return res.status(401).json({ status: 401, message: 'No refresh token' });
    }

    const jwt = await import('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.default.verify(refreshTokenValue, process.env.JWT_SECRET);
    } catch {
      clearTokenCookie(res);
      return res.status(401).json({ status: 401, message: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ status: 401, message: 'Invalid token type' });
    }

    // Look up user to get current role (in case it changed)
    const user = await dbUtils.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.blocked) {
      clearTokenCookie(res);
      return res.status(401).json({ status: 401, message: 'User not found or blocked' });
    }

    const newAccessToken = generateToken(user.id, {
      email: user.email,
      role: user.role,
      role_archive: user.role_archive,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    setTokenCookie(res, newAccessToken, newRefreshToken);
    res.json({ status: 200, message: 'Token refreshed' });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Get current user from token
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await dbUtils.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ status: 404, message: 'Utilisateur non trouvé' });
    }

    // Remove sensitive fields
    delete user.password_hash;
    delete user.password;

    res.json({
      status: 200,
      data: { ...user, full_name: `${user.prenom || ''} ${user.nom || ''}`.trim() }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Admin: Approve inscription request → create user account
 */
export const approveInscription = async (req, res) => {
  try {
    const { requestId, requestType } = req.body;

    if (!requestId || !requestType) {
      return res.status(400).json({ status: 400, message: 'requestId et requestType requis' });
    }

    let request, email, passwordHash, role, nom, prenom, etablissementNom, etablissementId;
    let classe = '', classeId = '', faculte = '', departement = '', orientation = '', optionFiliere = '', matricule = '';
    let postNom = '', sexe = '', dateNaissance = '', lieuNaissance = '', nationalite = '', etatCivil = '';
    let telephone = '', adresse = '', nomPere = '', nomMere = '';

    if (requestType === 'etudiant' || requestType === 'professeur') {
      request = await dbUtils.get('SELECT * FROM inscription_requests WHERE id = ?', [requestId]);
      if (!request) return res.status(404).json({ status: 404, message: 'Demande non trouvée' });
      if (request.statut !== 'en_attente') return res.status(400).json({ status: 400, message: 'Demande déjà traitée' });
      email = request.email;
      passwordHash = request.password_hash;
      role = request.type_utilisateur || 'etudiant';
      nom = request.nom;
      prenom = request.prenom;
      etablissementNom = request.etablissement_nom;
      etablissementId = request.etablissement_id;
      classe = request.classe || '';
      faculte = request.faculte || '';
      departement = request.departement || '';
      orientation = request.orientation || '';
      optionFiliere = request.option_filiere || '';
      matricule = request.matricule || '';
      postNom = request.post_nom || '';
      sexe = request.sexe || '';
      dateNaissance = request.date_naissance || '';
      lieuNaissance = request.lieu_naissance || '';
      nationalite = request.nationalite || '';
      etatCivil = request.etat_civil || '';
      telephone = request.telephone || '';
      adresse = request.adresse_candidat || '';
      nomPere = request.nom_pere || '';
      nomMere = request.nom_mere || '';

      // Look up classe_id from promotions table
      if (classe) {
        const promo = await dbUtils.get(
          'SELECT id FROM promotions WHERE nom = ? COLLATE NOCASE',
          [classe]
        );
        if (promo) classeId = promo.id;
      }

    } else if (requestType === 'parent') {
      request = await dbUtils.get('SELECT * FROM inscription_parents WHERE id = ?', [requestId]);
      if (!request) return res.status(404).json({ status: 404, message: 'Demande non trouvée' });
      if (request.statut !== 'en_attente') return res.status(400).json({ status: 400, message: 'Demande déjà traitée' });
      email = request.email;
      passwordHash = request.password_hash;
      role = 'parent';
      nom = request.nom;
      prenom = request.prenom;
      postNom = request.post_nom || '';
      telephone = request.telephone || '';
      adresse = request.adresse || '';
      etablissementNom = request.etablissement_nom || '';
      etablissementId = '';

    } else if (requestType === 'etablissement') {
      request = await dbUtils.get('SELECT * FROM inscription_etablissements WHERE id = ?', [requestId]);
      if (!request) return res.status(404).json({ status: 404, message: 'Demande non trouvée' });
      if (request.statut !== 'en_attente') return res.status(400).json({ status: 400, message: 'Demande déjà traitée' });
      email = request.email_responsable;
      passwordHash = request.password_hash;
      role = 'admin_etablissement';
      nom = request.nom_responsable;
      prenom = request.prenom_responsable;
      etablissementNom = request.nom_etablissement;

      // Look up matching establishment in etablissements_agrees (source of truth for IDs)
      const agreedEtab = await dbUtils.get(
        'SELECT id FROM etablissements_agrees WHERE denomination = ? COLLATE NOCASE',
        [request.nom_etablissement]
      );

      // Also create a record in establishments CRUD table for management
      const etabId = agreedEtab ? agreedEtab.id : uuidv4();
      const existingCrud = await dbUtils.get('SELECT id FROM establishments WHERE id = ?', [etabId]);
      if (!existingCrud) {
        await dbUtils.run(
          `INSERT INTO establishments (id, name, code, address, city, phone, email, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            etabId,
            request.nom_etablissement || '',
            request.code_etablissement || '',
            request.adresse || '',
            request.ville || '',
            request.telephone || '',
            request.email_etablissement || '',
          ]
        );
      }
      // Use the etablissements_agrees ID so it matches students/profs linked to the same establishment
      etablissementId = etabId;

    } else {
      return res.status(400).json({ status: 400, message: 'Type de demande invalide' });
    }

    const existingUser = await dbUtils.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'Un compte avec cet email existe déjà' });
    }

    const userId = uuidv4();
    await dbUtils.run(
      `INSERT INTO users (id, username, email, password_hash, prenom, nom, post_nom, role, role_archive, etablissement_nom, etablissement_id, classe, classe_id, faculte, departement, orientation, option_filiere, matricule, sexe, date_naissance, lieu_naissance, nationalite, etat_civil, telephone, adresse, nom_pere, nom_mere, isRegistered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, email, email, passwordHash, prenom || '', nom || '', postNom, role, role, etablissementNom || '', etablissementId || '', classe, classeId, faculte, departement, orientation, optionFiliere, matricule, sexe, dateNaissance, lieuNaissance, nationalite, etatCivil, telephone, adresse, nomPere, nomMere]
    );

    // Update request status
    const table = (requestType === 'parent') ? 'inscription_parents'
                : (requestType === 'etablissement') ? 'inscription_etablissements'
                : 'inscription_requests';
    if (table === 'inscription_requests') {
      await dbUtils.run(
        `UPDATE ${table} SET statut = 'approuvee', user_id = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [userId, requestId]
      );
    } else {
      await dbUtils.run(
        `UPDATE ${table} SET statut = 'approuvee', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [requestId]
      );
    }

    // Auto-create DossierInscription entries for student/professor inscriptions
    if ((requestType === 'etudiant' || requestType === 'professeur') && etablissementId) {
      try {
        const d = request; // full inscription_requests row
        const etudiantInfo = {
          etudiant_id: userId,
          etudiant_nom: `${d.prenom || ''} ${d.nom || ''}`.trim(),
          etudiant_email: d.email,
          etablissement_id: etablissementId,
          etablissement_nom: etablissementNom || '',
        };

        // 1. Root folder: "Mes Dossiers Académiques"
        const rootType = requestType === 'professeur' ? 'dossier_academique_professeur' : 'dossier_academique_etudiant';
        const rootId = uuidv4();
        await dbUtils.run(
          `INSERT INTO dossiers_inscription (id, nom, type, is_fichier, etudiant_id, etudiant_nom, etudiant_email, etablissement_id, etablissement_nom)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
          [rootId, 'Mes Dossiers Académiques', rootType,
           etudiantInfo.etudiant_id, etudiantInfo.etudiant_nom, etudiantInfo.etudiant_email,
           etudiantInfo.etablissement_id, etudiantInfo.etablissement_nom]
        );

        // 2. Sub-folder
        const subNom = requestType === 'professeur' ? 'Affectation' : 'Inscription';
        const subId = uuidv4();
        await dbUtils.run(
          `INSERT INTO dossiers_inscription (id, nom, type, is_fichier, parent_id, etudiant_id, etudiant_nom, etudiant_email, etablissement_id, etablissement_nom, certifie, pre_certification)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [subId, subNom, 'mon_inscription', rootId,
           etudiantInfo.etudiant_id, etudiantInfo.etudiant_nom, etudiantInfo.etudiant_email,
           etudiantInfo.etablissement_id, etudiantInfo.etablissement_nom]
        );

        // 3. File with full data as JSON
        const formNom = requestType === 'professeur' ? "Formulaire d'affectation" : "Formulaire d'inscription";
        const donneesJSON = JSON.stringify({
          id: d.id, nom: d.nom, post_nom: d.post_nom, prenom: d.prenom,
          matricule: d.matricule || matricule, email: d.email, telephone: d.telephone,
          date_naissance: d.date_naissance, lieu_naissance: d.lieu_naissance,
          sexe: d.sexe, nationalite: d.nationalite, etat_civil: d.etat_civil,
          nom_pere: d.nom_pere, nom_mere: d.nom_mere,
          province_origine: d.province_origine, district: d.district,
          territoire: d.territoire, adresse_candidat: d.adresse_candidat,
          ecole_secondaire: d.ecole_secondaire, adresse_ecole: d.adresse_ecole,
          centre_exetat: d.centre_exetat, section_secondaire: d.section_secondaire,
          annee_secondaire: d.annee_secondaire, pourcentage_obtenu: d.pourcentage_obtenu,
          numero_diplome_secondaire: d.numero_diplome_secondaire,
          etablissement_nom: d.etablissement_nom, faculte: d.faculte,
          departement: d.departement, orientation: d.orientation,
          option: d.option || d.option_filiere, classe: d.classe,
          type_utilisateur: d.type_utilisateur, created_date: d.createdAt,
          user_id: userId,
        });
        const formId = uuidv4();
        await dbUtils.run(
          `INSERT INTO dossiers_inscription (id, nom, type, fichier_type, is_fichier, parent_id, chemin, etudiant_id, etudiant_nom, etudiant_email, etablissement_id, etablissement_nom, certifie, pre_certification)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [formId, formNom, 'mon_inscription', 'formulaire_inscription', subId, donneesJSON,
           etudiantInfo.etudiant_id, etudiantInfo.etudiant_nom, etudiantInfo.etudiant_email,
           etudiantInfo.etablissement_id, etudiantInfo.etablissement_nom]
        );

        // 4. Folder: "Pièces jointes" + individual attachment files
        // PJ folder + individual PJ files are NOT created here.
        // They will be created by admin_etablissement after PJ review/approval
        // via the handleSendToStudent certification flow in FichiersInscriptions.
        logger.info(`📁 Auto-created DossierInscription for ${d.email} (${etablissementNom})`);
      } catch (dossierErr) {
        logger.warn('Auto-create DossierInscription error (non-blocking):', dossierErr.message);
      }
    }

    res.json({
      status: 200,
      message: 'Inscription approuvée. Le compte utilisateur a été créé.',
      data: { userId, email, role }
    });
  } catch (error) {
    logger.error('Approve inscription error:', error);
    res.status(500).json({ status: 500, message: "Erreur lors de l'approbation" });
  }
};

/**
 * Admin: Reject inscription request
 */
export const rejectInscription = async (req, res) => {
  try {
    const { requestId, requestType, motif } = req.body;

    if (!requestId || !requestType) {
      return res.status(400).json({ status: 400, message: 'requestId et requestType requis' });
    }

    const table = (requestType === 'parent') ? 'inscription_parents'
                : (requestType === 'etablissement') ? 'inscription_etablissements'
                : 'inscription_requests';

    await dbUtils.run(
      `UPDATE ${table} SET statut = 'rejete', motif_rejet = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [motif || '', requestId]
    );

    res.json({ status: 200, message: 'Inscription rejetée' });
  } catch (error) {
    logger.error('Reject inscription error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors du rejet' });
  }
};

/**
 * Admin: List all inscription requests
 */
export const listInscriptions = async (req, res) => {
  try {
    const { statut } = req.query;

    let etudiants, parents, etablissements;

    if (!statut || statut === 'all') {
      etudiants = await dbUtils.all('SELECT * FROM inscription_requests ORDER BY createdAt DESC');
      parents = await dbUtils.all('SELECT * FROM inscription_parents ORDER BY createdAt DESC');
      etablissements = await dbUtils.all('SELECT * FROM inscription_etablissements ORDER BY createdAt DESC');
    } else {
      etudiants = await dbUtils.all(
        'SELECT * FROM inscription_requests WHERE statut = ? ORDER BY createdAt DESC', [statut]
      );
      parents = await dbUtils.all(
        'SELECT * FROM inscription_parents WHERE statut = ? ORDER BY createdAt DESC', [statut]
      );
      etablissements = await dbUtils.all(
        'SELECT * FROM inscription_etablissements WHERE statut = ? ORDER BY createdAt DESC', [statut]
      );
    }

    res.json({
      status: 200,
      data: {
        etudiants: etudiants || [],
        parents: parents || [],
        etablissements: etablissements || [],
        total: (etudiants?.length || 0) + (parents?.length || 0) + (etablissements?.length || 0)
      }
    });
  } catch (error) {
    logger.error('List inscriptions error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Admin: Delete inscription request (and associated user account if approved)
 */
export const deleteInscription = async (req, res) => {
  try {
    const { requestId, requestType } = req.body;
    if (!requestId || !requestType) {
      return res.status(400).json({ status: 400, message: 'requestId et requestType requis' });
    }
    const table = (requestType === 'parent') ? 'inscription_parents'
                : (requestType === 'etablissement') ? 'inscription_etablissements'
                : 'inscription_requests';

    // Get the inscription record first to retrieve email and statut
    const inscription = await dbUtils.get(`SELECT * FROM ${table} WHERE id = ?`, [requestId]);
    if (!inscription) {
      return res.status(404).json({ status: 404, message: 'Demande non trouvée' });
    }

    // Determine the email field (établissements use email_responsable)
    const email = (requestType === 'etablissement') ? inscription.email_responsable : inscription.email;

    // If approved, also delete the user account from the users table
    if (inscription.statut === 'approuvee' && email) {
      await dbUtils.run(`DELETE FROM users WHERE email = ?`, [email]);
    }

    // Delete the inscription record
    await dbUtils.run(`DELETE FROM ${table} WHERE id = ?`, [requestId]);

    res.json({ status: 200, message: 'Demande et compte utilisateur supprimés avec succès' });
  } catch (error) {
    logger.error('Delete inscription error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la suppression' });
  }
};

/**
 * Admin: Update inscription request (type/role)
 */
export const updateInscription = async (req, res) => {
  try {
    const { requestId, requestType, data } = req.body;
    if (!requestId || !requestType || !data) {
      return res.status(400).json({ status: 400, message: 'requestId, requestType et data requis' });
    }
    const table = (requestType === 'parent') ? 'inscription_parents'
                : (requestType === 'etablissement') ? 'inscription_etablissements'
                : 'inscription_requests';

    if (requestType === 'etudiant' || requestType === 'professeur') {
      const editableFields = [
        'type_utilisateur', 'nom', 'post_nom', 'prenom', 'email', 'telephone',
        'sexe', 'nationalite', 'etat_civil', 'date_naissance', 'lieu_naissance', 'matricule',
        'nom_pere', 'nom_mere', 'province_origine', 'district', 'territoire', 'adresse_candidat',
        'ecole_secondaire', 'adresse_ecole', 'centre_exetat', 'section_secondaire',
        'annee_secondaire', 'pourcentage_obtenu', 'numero_diplome_secondaire',
        'annee_obtention_diplome', 'numero_diplome', 'specialite',
        'etablissement_nom', 'etablissement_id', 'faculte', 'departement',
        'orientation', 'option_filiere', 'option', 'classe'
      ];
      const setClauses = [];
      const values = [];
      for (const field of editableFields) {
        if (data[field] !== undefined) {
          setClauses.push(`"${field}" = ?`);
          values.push(data[field]);
        }
      }
      if (setClauses.length > 0) {
        setClauses.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(requestId);
        await dbUtils.run(
          `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`,
          values
        );
        // Also update user account if already approved and type changed
        if (data.type_utilisateur) {
          const request = await dbUtils.get(`SELECT * FROM ${table} WHERE id = ?`, [requestId]);
          if (request && request.statut === 'approuvee' && request.email) {
            await dbUtils.run(
              `UPDATE users SET role = ?, role_archive = ?, updatedAt = CURRENT_TIMESTAMP WHERE email = ?`,
              [data.type_utilisateur, data.type_utilisateur, request.email]
            );
          }
        }
      }
    } else if (requestType === 'etablissement') {
      const editableFields = [
        'nom_etablissement', 'code_etablissement', 'type', 'adresse', 'ville',
        'telephone', 'email_etablissement', 'nom_responsable', 'prenom_responsable',
        'email_responsable', 'telephone_responsable'
      ];
      const setClauses = [];
      const values = [];
      for (const field of editableFields) {
        if (data[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          values.push(data[field]);
        }
      }
      if (setClauses.length > 0) {
        setClauses.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(requestId);
        await dbUtils.run(
          `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`,
          values
        );
      }
    } else if (requestType === 'parent') {
      const editableFields = [
        'nom', 'post_nom', 'prenom', 'email', 'telephone', 'adresse',
        'nom_enfant', 'matricule_enfant', 'etablissement_nom'
      ];
      const setClauses = [];
      const values = [];
      for (const field of editableFields) {
        if (data[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          values.push(data[field]);
        }
      }
      if (setClauses.length > 0) {
        setClauses.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(requestId);
        await dbUtils.run(
          `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`,
          values
        );
      }
    }

    res.json({ status: 200, message: 'Demande mise à jour avec succès' });
  } catch (error) {
    logger.error('Update inscription error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la mise à jour' });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // Fields that should never be updated via this endpoint
    const protectedFields = ['id', 'password_hash', 'password', 'role', 'role_archive', 'username'];
    
    // Validate column name safety
    const safeColRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    
    // Build dynamic SET clause from provided data
    const setClauses = [];
    const params = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (protectedFields.includes(key)) continue;
      if (!safeColRegex.test(key)) continue;
      // Serialize arrays/objects to JSON
      const storedValue = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
      setClauses.push(`"${key}" = ?`);
      params.push(storedValue);
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ status: 400, message: 'Aucune donnée à mettre à jour' });
    }
    
    setClauses.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(userId);

    await dbUtils.run(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    const user = await dbUtils.get('SELECT * FROM users WHERE id = ?', [userId]);
    delete user.password_hash;
    delete user.password;

    res.json({
      status: 200,
      message: 'Profil mis à jour',
      data: { ...user, full_name: `${user.prenom || ''} ${user.nom || ''}`.trim() }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

export const signup = register;

/**
 * Super Admin: Create a new admin_systeme account directly (no inscription flow)
 * Only accessible to super_admin role
 */
export const createAdminSysteme = async (req, res) => {
  try {
    const callerRole = req.user?.role_archive || req.user?.role;
    if (callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Accès refusé. Réservé au Super Administrateur.' });
    }

    const { email, password, nom, prenom, role_type, province_affectation } = req.body;

    if (!email || !password || !nom || !prenom) {
      return res.status(400).json({ status: 400, message: 'Email, mot de passe, nom et prénom requis' });
    }
    const pwdError4 = validatePassword(password);
    if (pwdError4) {
      return res.status(400).json({ status: 400, message: pwdError4 });
    }

    const allowedRoles = ['admin_systeme', 'admin_ministeriel'];
    const selectedRole = allowedRoles.includes(role_type) ? role_type : 'admin_systeme';

    if (selectedRole === 'admin_ministeriel' && !province_affectation) {
      return res.status(400).json({ status: 400, message: 'La province d\'affectation est requise pour un administrateur ministériel' });
    }

    const existingUser = await dbUtils.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'Un compte avec cet email existe déjà' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();
    const etablissementNom = selectedRole === 'admin_systeme' ? 'HARCHIVE' : selectedRole === 'admin_ministeriel' ? 'MINISTERE' : '';

    await dbUtils.run(
      `INSERT INTO users (id, username, email, password_hash, prenom, nom, role, role_archive, etablissement_nom, province_affectation, isRegistered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, email, email, passwordHash, prenom.trim(), nom.trim(), selectedRole, selectedRole, etablissementNom, selectedRole === 'admin_ministeriel' ? (province_affectation || '').trim() : '']
    );

    res.status(201).json({
      status: 201,
      message: `Compte ${selectedRole === 'admin_ministeriel' ? 'administrateur ministériel' : 'administrateur système'} créé avec succès`,
      data: { id: userId, email, prenom: prenom.trim(), nom: nom.trim(), role_archive: selectedRole }
    });
  } catch (error) {
    logger.error('Create admin systeme error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la création du compte' });
  }
};

/**
 * Admin/Super Admin: Block or unblock a user account
 */
export const blockUser = async (req, res) => {
  try {
    const callerRole = req.user?.role_archive || req.user?.role;
    if (callerRole !== 'admin_systeme' && callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Accès refusé' });
    }

    const { userId, blocked } = req.body;
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'userId requis' });
    }

    const target = await dbUtils.get('SELECT id, role_archive FROM users WHERE id = ?', [userId]);
    if (!target) {
      return res.status(404).json({ status: 404, message: 'Utilisateur non trouvé' });
    }

    // Only super_admin can block admin_systeme or other super_admins
    if ((target.role_archive === 'admin_systeme' || target.role_archive === 'super_admin') && callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Seul un Super Admin peut bloquer un administrateur' });
    }

    // Cannot block yourself
    if (userId === req.user.id) {
      return res.status(400).json({ status: 400, message: 'Vous ne pouvez pas bloquer votre propre compte' });
    }

    await dbUtils.run('UPDATE users SET blocked = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [blocked ? 1 : 0, userId]);

    res.json({
      status: 200,
      message: blocked ? 'Utilisateur bloqué avec succès' : 'Utilisateur débloqué avec succès'
    });
  } catch (error) {
    logger.error('Block user error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors du blocage' });
  }
};

/**
 * Super Admin ONLY: Delete a user account AND all associated data
 */
export const deleteUser = async (req, res) => {
  try {
    const callerRole = req.user?.role_archive || req.user?.role;
    // Only super_admin can perform full account deletion
    if (callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Seul le Super Admin peut supprimer un compte' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'userId requis' });
    }

    const target = await dbUtils.get('SELECT id, role_archive, email FROM users WHERE id = ?', [userId]);
    if (!target) {
      return res.status(404).json({ status: 404, message: 'Utilisateur non trouvé' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ status: 400, message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Cannot delete another super_admin
    if (target.role_archive === 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Impossible de supprimer un Super Admin' });
    }

    const deletedData = {};

    // 1. Publications & comments
    const pubs = await dbUtils.all('SELECT id FROM publications WHERE auteur_id = ?', [userId]);
    if (pubs.length > 0) {
      const pubIds = pubs.map(p => p.id);
      // Delete comments on user's publications
      for (const pid of pubIds) {
        await dbUtils.run('DELETE FROM commentaires WHERE publication_id = ?', [pid]);
      }
      await dbUtils.run('DELETE FROM publications WHERE auteur_id = ?', [userId]);
    }
    // Delete user's comments on other publications
    const delComments = await dbUtils.run('DELETE FROM commentaires WHERE auteur_id = ?', [userId]);
    deletedData.publications = pubs.length;
    deletedData.commentaires = (delComments?.changes || 0);

    // 2. Photos / gallery
    const delPhotos = await dbUtils.run('DELETE FROM photos WHERE created_by = ?', [userId]);
    deletedData.photos = delPhotos?.changes || 0;

    // 3. Notifications (sent to user)
    const delNotifs = await dbUtils.run('DELETE FROM notifications WHERE destinataire_id = ?', [userId]);
    deletedData.notifications = delNotifs?.changes || 0;

    // 4. Messages
    const delMsgs = await dbUtils.run('DELETE FROM messages WHERE auteur_id = ?', [userId]);
    deletedData.messages = delMsgs?.changes || 0;

    // 5. Conversations where user is participant — remove user from participants JSON
    const allConvs = await dbUtils.all('SELECT id, participants FROM conversations', []);
    let convDeleted = 0;
    for (const conv of allConvs) {
      try {
        const participants = JSON.parse(conv.participants || '[]');
        if (participants.includes(userId)) {
          const remaining = participants.filter(pid => pid !== userId);
          if (remaining.length < 2) {
            // Delete conversation + its messages if less than 2 participants remain
            await dbUtils.run('DELETE FROM messages WHERE conversation_id = ?', [conv.id]);
            await dbUtils.run('DELETE FROM conversations WHERE id = ?', [conv.id]);
            convDeleted++;
          } else {
            await dbUtils.run('UPDATE conversations SET participants = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(remaining), conv.id]);
          }
        }
      } catch { /* skip malformed */ }
    }
    deletedData.conversations_deleted = convDeleted;

    // 6. Group messages
    const delGrpMsgs = await dbUtils.run('DELETE FROM group_messages WHERE sender_id = ?', [userId]);
    deletedData.group_messages = delGrpMsgs?.changes || 0;

    // 7. Groups — remove user from members, transfer/delete groups they admin
    const allGroups = await dbUtils.all('SELECT id, admin_id, members FROM groups', []);
    let groupsDeleted = 0;
    for (const grp of allGroups) {
      if (grp.admin_id === userId) {
        // Delete groups the user administers + their messages
        await dbUtils.run('DELETE FROM group_messages WHERE group_id = ?', [grp.id]);
        await dbUtils.run('DELETE FROM groups WHERE id = ?', [grp.id]);
        groupsDeleted++;
      } else {
        try {
          const members = JSON.parse(grp.members || '[]');
          if (members.includes(userId)) {
            const remaining = members.filter(mid => mid !== userId);
            await dbUtils.run('UPDATE groups SET members = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(remaining), grp.id]);
          }
        } catch { /* skip */ }
      }
    }
    deletedData.groups_deleted = groupsDeleted;

    // 8. Friend requests & blocked users
    const delFR = await dbUtils.run('DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
    const delBU = await dbUtils.run('DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?', [userId, userId]);
    deletedData.friend_requests = delFR?.changes || 0;
    deletedData.blocked_users = delBU?.changes || 0;

    // 9. Remove user from other users' amis JSON array
    const allUsers = await dbUtils.all('SELECT id, amis FROM users WHERE amis LIKE ?', [`%${userId}%`]);
    for (const u of allUsers) {
      try {
        const amis = JSON.parse(u.amis || '[]');
        if (amis.includes(userId)) {
          const updated = amis.filter(aid => aid !== userId);
          await dbUtils.run('UPDATE users SET amis = ? WHERE id = ?', [JSON.stringify(updated), u.id]);
        }
      } catch { /* skip */ }
    }

    // 10. Academic data — dossiers_inscription, canaux_renvoi
    const delDossiers = await dbUtils.run('DELETE FROM dossiers_inscription WHERE etudiant_id = ?', [userId]);
    const delCanaux = await dbUtils.run('DELETE FROM canaux_renvoi WHERE etudiant_email = ?', [target.email]);
    deletedData.dossiers_inscription = delDossiers?.changes || 0;
    deletedData.canaux_renvoi = delCanaux?.changes || 0;

    // 11. Grades
    const delNotes = await dbUtils.run('DELETE FROM notes_etudiants WHERE etudiant_id = ? OR professeur_id = ?', [userId, userId]);
    const delNotesArch = await dbUtils.run('DELETE FROM notes_archive WHERE etudiant_id = ? OR professeur_id = ?', [userId, userId]);
    deletedData.notes = (delNotes?.changes || 0) + (delNotesArch?.changes || 0);

    // 12. Professor assignments & calendar & attendance & lesson plans & exams
    const delAssign = await dbUtils.run('DELETE FROM assignation_professeurs WHERE professeur_id = ?', [userId]);
    const delCal = await dbUtils.run('DELETE FROM calendrier_academique WHERE professeur_id = ?', [userId]);
    const delPresence = await dbUtils.run('DELETE FROM liste_presence WHERE professeur_id = ?', [userId]);
    const delFiches = await dbUtils.run('DELETE FROM fiches_preparation WHERE professeur_id = ?', [userId]);
    const delExams = await dbUtils.run('DELETE FROM questionnaires_examen WHERE professeur_id = ?', [userId]);
    deletedData.academic = (delAssign?.changes || 0) + (delCal?.changes || 0) + (delPresence?.changes || 0) + (delFiches?.changes || 0) + (delExams?.changes || 0);

    // 13. Inscription requests linked to this user
    const delIR = await dbUtils.run('DELETE FROM inscription_requests WHERE user_id = ? OR email = ?', [userId, target.email]);
    deletedData.inscription_requests = delIR?.changes || 0;

    // 14. Finally, delete the user account
    await dbUtils.run('DELETE FROM users WHERE id = ?', [userId]);

    logger.info(`[SUPER_ADMIN] User ${target.email} (${userId}) fully deleted. Data removed:`, deletedData);

    res.json({
      status: 200,
      message: `Compte de ${target.email} supprimé avec toutes les données associées`,
      deletedData
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la suppression' });
  }
};

/**
 * Super Admin: Update a user's editable fields
 */
export const adminUpdateUser = async (req, res) => {
  try {
    const callerRole = req.user?.role_archive || req.user?.role;
    if (callerRole !== 'super_admin' && callerRole !== 'admin_systeme') {
      return res.status(403).json({ status: 403, message: 'Accès refusé' });
    }

    const { userId, data } = req.body;
    if (!userId || !data) {
      return res.status(400).json({ status: 400, message: 'userId et data requis' });
    }

    const target = await dbUtils.get('SELECT id, role_archive FROM users WHERE id = ?', [userId]);
    if (!target) {
      return res.status(404).json({ status: 404, message: 'Utilisateur non trouvé' });
    }

    // Only super_admin can edit admin_systeme or super_admin accounts
    if ((target.role_archive === 'admin_systeme' || target.role_archive === 'super_admin') && callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Seul un Super Admin peut modifier un administrateur' });
    }

    // Allowed editable fields
    const allowedFields = ['nom', 'post_nom', 'prenom', 'email', 'role_archive', 'etablissement_nom', 'etablissement_id'];
    const updates = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updates[key] = data[key];
      }
    }

    // role_archive change requires super_admin
    if (updates.role_archive && callerRole !== 'super_admin') {
      return res.status(403).json({ status: 403, message: 'Seul un Super Admin peut changer le rôle' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 400, message: 'Aucun champ valide à mettre à jour' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), userId];
    await dbUtils.run(`UPDATE users SET ${setClauses}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, values);

    // Also update role if role_archive changed
    if (updates.role_archive) {
      await dbUtils.run('UPDATE users SET role = ? WHERE id = ?', [updates.role_archive, userId]);
    }

    const updated = await dbUtils.get('SELECT * FROM users WHERE id = ?', [userId]);

    res.json({
      status: 200,
      message: 'Utilisateur mis à jour avec succès',
      data: updated
    });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la mise à jour' });
  }
};

/**
 * Send email verification code
 * POST /api/auth/send-verification
 */
export const sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 400, message: 'Email requis' });
    }

    // Rate limit: max 5 codes per email per hour
    const recentCodes = await dbUtils.all(
      `SELECT id FROM email_verifications WHERE email = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [email]
    );
    if (recentCodes.length >= 5) {
      return res.status(429).json({ status: 429, message: 'Trop de demandes. Réessayez dans une heure.' });
    }

    const code = generateCode();
    const id = uuidv4();

    // Expires in 10 minutes
    await dbUtils.run(
      `INSERT INTO email_verifications (id, email, code, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [id, email, code]
    );

    const sent = await sendVerificationCode(email, code);
    if (!sent) {
      return res.status(500).json({ status: 500, message: "Erreur lors de l'envoi de l'email" });
    }

    res.json({ status: 200, message: 'Code de vérification envoyé', data: { verificationId: id } });
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({ status: 500, message: "Erreur lors de l'envoi du code" });
  }
};

/**
 * Verify email code
 * POST /api/auth/verify-email
 */
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ status: 400, message: 'Email et code requis' });
    }

    const record = await dbUtils.get(
      `SELECT * FROM email_verifications WHERE email = ? AND verified = 0 AND expires_at > NOW() ORDER BY createdAt DESC LIMIT 1`,
      [email]
    );

    if (!record) {
      return res.status(400).json({ status: 400, message: 'Code expiré ou invalide. Demandez un nouveau code.' });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({ status: 429, message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    // Increment attempts
    await dbUtils.run(`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`, [record.id]);

    if (record.code !== code) {
      return res.status(400).json({ status: 400, message: 'Code incorrect' });
    }

    // Mark as verified
    await dbUtils.run(`UPDATE email_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    res.json({ status: 200, message: 'Email vérifié avec succès', data: { verified: true } });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ status: 500, message: 'Erreur lors de la vérification' });
  }
};

/**
 * Send a verification code for account settings actions (password change, email change).
 * POST /api/auth/settings/send-code
 * Body: { purpose: 'password_change' | 'email_change', newEmail? }
 */
export const sendSettingsCode = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const { purpose, newEmail } = req.body;
    if (!purpose) return res.status(400).json({ status: 400, message: 'purpose requis' });

    const user = await dbUtils.get('SELECT email FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ status: 404, message: 'Utilisateur introuvable' });

    const targetEmail = (purpose === 'email_change' && newEmail) ? newEmail : user.email;

    // Validate new email not already taken
    if (purpose === 'email_change' && newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ status: 400, message: 'Adresse email invalide' });
      }
      const existing = await dbUtils.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, userId]);
      if (existing) return res.status(409).json({ status: 409, message: 'Cet email est déjà utilisé par un autre compte' });
    }

    // Rate limit: 5 codes per email per hour
    const recent = await dbUtils.all(
      `SELECT id FROM email_verifications WHERE email = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [targetEmail]
    );
    if (recent.length >= 5) {
      return res.status(429).json({ status: 429, message: 'Trop de demandes. Réessayez dans une heure.' });
    }

    const code = generateCode();
    const id = uuidv4();
    await dbUtils.run(
      `INSERT INTO email_verifications (id, email, code, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [id, targetEmail, code]
    );

    const sent = await sendVerificationCode(targetEmail, code, purpose);
    if (!sent) return res.status(500).json({ status: 500, message: "Erreur lors de l'envoi de l'email" });

    res.json({ status: 200, message: 'Code envoyé', data: { verificationId: id, email: targetEmail } });
  } catch (error) {
    logger.error('sendSettingsCode error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Change password (requires current password + email verification code).
 * POST /api/auth/settings/change-password
 * Body: { currentPassword, newPassword, code }
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const { currentPassword, newPassword, code } = req.body;
    if (!currentPassword || !newPassword || !code) {
      return res.status(400).json({ status: 400, message: 'Mot de passe actuel, nouveau mot de passe et code requis' });
    }

    const user = await dbUtils.get('SELECT id, email, password_hash FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ status: 404, message: 'Utilisateur introuvable' });

    // Validate current password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ status: 400, message: 'Mot de passe actuel incorrect' });

    // Validate new password strength
    const pwdError = validatePassword(newPassword);
    if (pwdError) return res.status(400).json({ status: 400, message: pwdError });

    // Validate email code
    const record = await dbUtils.get(
      `SELECT * FROM email_verifications WHERE email = ? AND verified = 0 AND expires_at > NOW() ORDER BY createdAt DESC LIMIT 1`,
      [user.email]
    );
    if (!record) return res.status(400).json({ status: 400, message: 'Code expiré ou invalide' });
    if (record.attempts >= 5) return res.status(429).json({ status: 429, message: 'Trop de tentatives. Demandez un nouveau code.' });

    await dbUtils.run(`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`, [record.id]);
    if (record.code !== code) return res.status(400).json({ status: 400, message: 'Code incorrect' });
    await dbUtils.run(`UPDATE email_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    // Update password
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await dbUtils.run('UPDATE users SET password_hash = ?, updatedAt = NOW() WHERE id = ?', [newHash, userId]);

    logger.info(`✅ Password changed for user ${userId}`);
    res.json({ status: 200, message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    logger.error('changePassword error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Change email (requires email verification code sent to the NEW email).
 * POST /api/auth/settings/change-email
 * Body: { newEmail, code }
 */
export const changeEmail = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const { newEmail, code } = req.body;
    if (!newEmail || !code) return res.status(400).json({ status: 400, message: 'Nouvel email et code requis' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ status: 400, message: 'Adresse email invalide' });
    }

    const existing = await dbUtils.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, userId]);
    if (existing) return res.status(409).json({ status: 409, message: 'Cet email est déjà utilisé par un autre compte' });

    // Validate code sent to newEmail
    const record = await dbUtils.get(
      `SELECT * FROM email_verifications WHERE email = ? AND verified = 0 AND expires_at > NOW() ORDER BY createdAt DESC LIMIT 1`,
      [newEmail]
    );
    if (!record) return res.status(400).json({ status: 400, message: 'Code expiré ou invalide' });
    if (record.attempts >= 5) return res.status(429).json({ status: 429, message: 'Trop de tentatives. Demandez un nouveau code.' });

    await dbUtils.run(`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`, [record.id]);
    if (record.code !== code) return res.status(400).json({ status: 400, message: 'Code incorrect' });
    await dbUtils.run(`UPDATE email_verifications SET verified = 1 WHERE id = ?`, [record.id]);

    // Update email in users table and username if it was the email
    const user = await dbUtils.get('SELECT email, username FROM users WHERE id = ?', [userId]);
    await dbUtils.run('UPDATE users SET email = ?, updatedAt = NOW() WHERE id = ?', [newEmail, userId]);
    // If username == old email, update it too
    if (user.username === user.email) {
      await dbUtils.run('UPDATE users SET username = ? WHERE id = ?', [newEmail, userId]);
    }

    logger.info(`✅ Email changed for user ${userId}: ${user.email} → ${newEmail}`);
    res.json({ status: 200, message: 'Email mis à jour avec succès', data: { email: newEmail } });
  } catch (error) {
    logger.error('changeEmail error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Get notification preferences.
 * GET /api/auth/settings/notification-prefs
 */
export const getNotifPrefs = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const user = await dbUtils.get('SELECT notification_prefs FROM users WHERE id = ?', [userId]);
    const defaultPrefs = {
      email_messages: true,
      email_inscriptions: true,
      email_notes: true,
      email_presence: false,
      push_messages: true,
      push_inscriptions: true,
      push_notes: true,
      push_presence: true,
    };
    let prefs = defaultPrefs;
    if (user?.notification_prefs) {
      try { prefs = { ...defaultPrefs, ...JSON.parse(user.notification_prefs) }; } catch (_) {}
    }
    res.json({ status: 200, data: prefs });
  } catch (error) {
    logger.error('getNotifPrefs error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Update notification preferences.
 * PUT /api/auth/settings/notification-prefs
 */
export const updateNotifPrefs = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const prefs = req.body;
    await dbUtils.run('UPDATE users SET notification_prefs = ?, updatedAt = NOW() WHERE id = ?', [JSON.stringify(prefs), userId]);
    res.json({ status: 200, message: 'Préférences mises à jour' });
  } catch (error) {
    logger.error('updateNotifPrefs error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

/**
 * Update privacy settings.
 * PUT /api/auth/settings/privacy
 */
export const updatePrivacy = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Non authentifié' });

    const { journal_public, journal_ouvert } = req.body;
    const updates = {};
    if (typeof journal_public === 'number') updates.journal_public = journal_public;
    if (typeof journal_ouvert === 'number') updates.journal_ouvert = journal_ouvert;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 400, message: 'Aucun paramètre fourni' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await dbUtils.run(`UPDATE users SET ${setClauses}, updatedAt = NOW() WHERE id = ?`, [...Object.values(updates), userId]);
    res.json({ status: 200, message: 'Paramètres de confidentialité mis à jour' });
  } catch (error) {
    logger.error('updatePrivacy error:', error);
    res.status(500).json({ status: 500, message: 'Erreur serveur' });
  }
};

export default { signup, login, getCurrentUser, updateProfile };
