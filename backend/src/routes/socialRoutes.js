import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getAllFriendRequests,
  getBlockedUsers,
} from '../controllers/socialController.js';

const router = express.Router();

router.post('/friend-request/send', verifyToken, sendFriendRequest);
router.post('/friend-request/accept', verifyToken, acceptFriendRequest);
router.post('/friend-request/reject', verifyToken, rejectFriendRequest);
router.post('/friend/remove', verifyToken, removeFriend);
router.post('/block', verifyToken, blockUser);
router.post('/unblock', verifyToken, unblockUser);
router.get('/friend-requests', verifyToken, getAllFriendRequests);
router.get('/blocked', verifyToken, getBlockedUsers);

export default router;
