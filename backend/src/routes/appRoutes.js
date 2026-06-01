import express from 'express';
import { getPublicSettings } from '../controllers/appSettingsController.js';

const router = express.Router();

/**
 * Get app public settings
 */
router.get('/apps/public/prod/public-settings/by-id/:appId', getPublicSettings);

export default router;
