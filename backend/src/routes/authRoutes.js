import express from 'express';
import {
  register, registerParent, registerEtablissement,
  login, getCurrentUser, updateProfile,
  approveInscription, rejectInscription, listInscriptions,
  deleteInscription, updateInscription,
  createAdminSysteme,
  blockUser, deleteUser, adminUpdateUser,
  refreshAccessToken,
  sendEmailVerification, verifyEmailCode
} from '../controllers/authController.js';
import { verifyToken, requireRole, clearTokenCookie } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public routes (no authentication required)
 */
router.post('/register', register);
router.post('/register/parent', registerParent);
router.post('/register/etablissement', registerEtablissement);
router.post('/login', login);
router.post('/send-verification', sendEmailVerification);
router.post('/verify-email', verifyEmailCode);
router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ status: 200, message: 'Déconnexion réussie' });
});
router.post('/refresh', refreshAccessToken);

/**
 * Protected routes (authentication required)
 */
router.get('/me', verifyToken, getCurrentUser);
router.put('/me', verifyToken, updateProfile);

/**
 * Admin routes (for managing inscriptions) — requires admin role
 */
router.get('/inscriptions', verifyToken, requireRole('admin_systeme', 'super_admin', 'admin_etablissement'), listInscriptions);
router.post('/inscriptions/approve', verifyToken, requireRole('admin_systeme', 'super_admin', 'admin_etablissement'), approveInscription);
router.post('/inscriptions/reject', verifyToken, requireRole('admin_systeme', 'super_admin', 'admin_etablissement'), rejectInscription);
router.post('/inscriptions/delete', verifyToken, requireRole('admin_systeme', 'super_admin'), deleteInscription);
router.post('/inscriptions/update', verifyToken, requireRole('admin_systeme', 'super_admin', 'admin_etablissement'), updateInscription);

/**
 * Super Admin routes — requires super_admin role
 */
router.post('/admin/create-admin-systeme', verifyToken, requireRole('super_admin'), createAdminSysteme);
router.post('/admin/block-user', verifyToken, requireRole('admin_systeme', 'super_admin'), blockUser);
router.post('/admin/delete-user', verifyToken, requireRole('super_admin'), deleteUser);
router.post('/admin/update-user', verifyToken, requireRole('admin_systeme', 'super_admin'), adminUpdateUser);

export default router;
