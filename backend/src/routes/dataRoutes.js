import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  queryEntity,
  getEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
  queryPublicEtablissements,
  queryPublicStructure,
  queryPublicPublications
} from '../controllers/dataController.js';

const router = express.Router();

/**
 * Public routes (no authentication required)
 */
router.get('/public/etablissements-agrees', queryPublicEtablissements);
router.get('/public/structure/:etablissementId', queryPublicStructure);
router.get('/public/publications', queryPublicPublications);

/**
 * All data routes require authentication
 */

// Query entities with filters
router.post('/entities/:entityName/query', verifyToken, queryEntity);

// Get single entity
router.get('/entities/:entityName/:entityId', verifyToken, getEntityById);

// Create entity
router.post('/entities/:entityName', verifyToken, createEntity);

// Update entity
router.put('/entities/:entityName/:entityId', verifyToken, updateEntity);

// Delete entity
router.delete('/entities/:entityName/:entityId', verifyToken, deleteEntity);

export default router;
