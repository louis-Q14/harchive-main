/**
 * Social Service
 * Handles friend requests, blocking, and social interactions
 */

import { backendConfig } from './backendConfig.js';
import { apiClient } from './httpClient.js';

/**
 * Service for social operations
 */
export const socialService = {
  /**
   * Send a friend request
   * @param {string} recipientId - ID of user to send request to
   * @returns {Promise<Object>} Request result
   */
  async sendFriendRequest(recipientId) {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.post(`/api/social/friend-request/send`, {
          recipientId,
        });
        return response.data;
      } else {
        // TODO: Implement with Base44 or backend API
        throw new Error('sendFriendRequest not implemented for this backend');
      }
    } catch (error) {
      console.error('socialService.sendFriendRequest error:', error);
      throw error;
    }
  },

  /**
   * Accept a friend request
   * @param {string} requestId - ID of friend request
   * @returns {Promise<Object>} Result
   */
  async acceptFriendRequest(requestId) {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.post(
          `/api/social/friend-request/accept`,
          { requestId }
        );
        return response.data;
      } else {
        // TODO: Implement with Base44 or backend API
        throw new Error('acceptFriendRequest not implemented for this backend');
      }
    } catch (error) {
      console.error('socialService.acceptFriendRequest error:', error);
      throw error;
    }
  },

  /**
   * Reject a friend request
   * @param {string} requestId - ID of friend request
   * @returns {Promise<void>}
   */
  async rejectFriendRequest(requestId) {
    try {
      if (backendConfig.useLocalBackend) {
        await apiClient.post(`/api/social/friend-request/reject`, { requestId });
      } else {
        throw new Error('rejectFriendRequest not implemented');
      }
    } catch (error) {
      console.error('socialService.rejectFriendRequest error:', error);
      throw error;
    }
  },

  /**
   * Remove a friend
   * @param {string} friendId - ID of friend to remove
   * @returns {Promise<void>}
   */
  async removeFriend(friendId) {
    try {
      if (backendConfig.useLocalBackend) {
        await apiClient.post(`/api/social/friend/remove`, { friendId });
      } else {
        throw new Error('removeFriend not implemented');
      }
    } catch (error) {
      console.error('socialService.removeFriend error:', error);
      throw error;
    }
  },

  /**
   * Block a user
   * @param {string} userId - ID of user to block
   * @returns {Promise<Object>} Result
   */
  async blockUser(userId) {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.post(`/api/social/block`, { userId });
        return response.data;
      } else {
        throw new Error('blockUser not implemented');
      }
    } catch (error) {
      console.error('socialService.blockUser error:', error);
      throw error;
    }
  },

  /**
   * Unblock a user
   * @param {string} userId - ID of user to unblock
   * @returns {Promise<void>}
   */
  async unblockUser(userId) {
    try {
      if (backendConfig.useLocalBackend) {
        await apiClient.post(`/api/social/unblock`, { userId });
      } else {
        throw new Error('unblockUser not implemented');
      }
    } catch (error) {
      console.error('socialService.unblockUser error:', error);
      throw error;
    }
  },

  /**
   * Get list of friends
   * @param {string} userId - ID of user
   * @returns {Promise<Array>} List of friends
   */
  async getFriends(userId) {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.get(`/api/social/friends/${userId}`);
        return response.data;
      } else {
        throw new Error('getFriends not implemented');
      }
    } catch (error) {
      console.error('socialService.getFriends error:', error);
      throw error;
    }
  },

  /**
   * Get pending friend requests
   * @returns {Promise<Array>} Pending requests
   */
  async getPendingRequests() {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.get(`/api/social/friend-requests/pending`);
        return response.data;
      } else {
        throw new Error('getPendingRequests not implemented');
      }
    } catch (error) {
      console.error('socialService.getPendingRequests error:', error);
      throw error;
    }
  },

  async getAllFriendRequests() {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.get(`/api/social/friend-requests`);
        return response?.data || [];
      }
      return [];
    } catch (error) {
      console.error('socialService.getAllFriendRequests error:', error);
      throw error;
    }
  },

  async getBlockedUsers() {
    try {
      if (backendConfig.useLocalBackend) {
        const response = await apiClient.get(`/api/social/blocked`);
        return response?.data || [];
      }
      return [];
    } catch (error) {
      console.error('socialService.getBlockedUsers error:', error);
      throw error;
    }
  },
};

export default socialService;
