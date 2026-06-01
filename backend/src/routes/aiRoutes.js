import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { chatWithAI, getSuggestions } from '../controllers/aiController.js';

const router = express.Router();

router.post('/ai/chat', verifyToken, chatWithAI);
router.post('/ai/suggestions', verifyToken, getSuggestions);

export default router;
