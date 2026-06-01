/**
 * Authentication Service Abstraction Layer
 * Abstracts Base44 auth methods - can be swapped with custom backend
 * 
 * Current implementation: Uses Base44 SDK OR Local Backend API
 * Future: Could use custom OAuth/JWT backend
 */

import { base44 } from './base44Client';
import { createHttpClient } from './httpClient';
import { backendConfig } from './backendConfig';
import { appParams } from '@/lib/app-params';

/**
 * Authentication service - supports both Base44 and local backend
 */
export const authService = {
  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API (cookie is sent automatically via withCredentials)
        const response = await createHttpClient({
          baseURL: backendConfig.localBackendUrl,
        }).get('/api/auth/me');
        // Unwrap { status, data } envelope — return user object directly
        return response?.data || response;
      } else {
        // Use Base44 SDK
        const user = await base44.auth.me();
        return user;
      }
    } catch (error) {
      throw {
        status: error.status || 401,
        message: error.message || 'Failed to fetch current user',
        originalError: error,
      };
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  },

  /**
   * Logout current user
   * @param {string} redirectUrl - URL to redirect after logout
   */
  async logout(redirectUrl = null) {
    try {
      if (backendConfig.useLocalBackend) {
        // Call backend to clear HttpOnly cookie
        try {
          await createHttpClient({ baseURL: backendConfig.localBackendUrl }).post('/api/auth/logout');
        } catch { /* ignore logout call failure */ }
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      } else {
        // Base44 logout
        localStorage.removeItem('base44_access_token');
        base44.auth.logout(redirectUrl || undefined);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  },

  /**
   * Redirect to login page
   * @param {string} returnUrl - URL to return to after login
   */
  redirectToLogin(returnUrl = null) {
    try {
      if (backendConfig.useLocalBackend) {
        // Local backend login redirect (would need a dedicated login page)
        window.location.href = `${backendConfig.localBackendUrl}/login?return=${encodeURIComponent(
          returnUrl || window.location.href
        )}`;
      } else {
        // Base44 redirect to login
        base44.auth.redirectToLogin(returnUrl || window.location.href);
      }
    } catch (error) {
      console.error('Redirect to login failed:', error);
      // Fallback: redirect manually
      window.location.href = `${backendConfig.getAuthUrl()}/login?return=${encodeURIComponent(
        returnUrl || window.location.href
      )}`;
    }
  },

  /**
   * Update current user profile
   * @param {Object} data - User data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateProfile(data) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API (cookie is sent automatically)
        const response = await createHttpClient({
          baseURL: backendConfig.localBackendUrl,
        }).put('/api/auth/me', data);
        return response;
      } else {
        // Use Base44 SDK
        const updated = await base44.auth.updateMe(data);
        return updated;
      }
    } catch (error) {
      throw {
        status: error.status || 400,
        message: error.message || 'Failed to update profile',
        originalError: error,
      };
    }
  },

  /**
   * Get auth token from storage
   */
  getToken() {
    // Token is now in HttpOnly cookie; this method exists for Base44 compatibility
    return appParams.token || null;
  },

  /**
   * Clear auth token from storage
   */
  clearToken() {
    // Token is in HttpOnly cookie, cleared via /api/auth/logout
  },

  /**
   * Login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} { user, token }
   */
  async loginWithEmail(email, password) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    const response = await client.post('/api/auth/login', { email, password });
    // Token is now set as HttpOnly cookie by the server
    return { user: response.data };
  },

  /**
   * Send email verification code
   */
  async sendVerificationCode(email) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/send-verification', { email });
  },

  /**
   * Verify email code
   */
  async verifyEmailCode(email, code) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/verify-email', { email, code });
  },

  /**
   * Register étudiant/professeur (creates pending request)
   */
  async registerUser(formData) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/register', formData);
  },

  /**
   * Register parent (creates pending request)
   */
  async registerParent(formData) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/register/parent', formData);
  },

  /**
   * Register établissement (creates pending request)
   */
  async registerEtablissement(formData) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/register/etablissement', formData);
  },

  /**
   * Admin: List inscription requests
   */
  async listInscriptions(statut = 'en_attente') {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.get(`/api/auth/inscriptions?statut=${encodeURIComponent(statut)}`);
  },

  /**
   * Admin: Approve inscription
   */
  async approveInscription(requestId, requestType) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/inscriptions/approve', { requestId, requestType });
  },

  /**
   * Admin: Reject inscription
   */
  async rejectInscription(requestId, requestType, motif) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/inscriptions/reject', { requestId, requestType, motif });
  },

  async deleteInscription(requestId, requestType) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/inscriptions/delete', { requestId, requestType });
  },

  async updateInscription(requestId, requestType, data) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/inscriptions/update', { requestId, requestType, data });
  },

  /**
   * Super Admin: Create an admin_systeme account directly
   * @param {{ nom: string, prenom: string, email: string, password: string }} data
   */
  async createAdminSysteme(data) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/admin/create-admin-systeme', data);
  },

  async blockUser(userId, blocked) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/admin/block-user', { userId, blocked });
  },

  async deleteUser(userId) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/admin/delete-user', { userId });
  },

  async adminUpdateUser(userId, data) {
    const client = createHttpClient({ baseURL: backendConfig.localBackendUrl });
    return await client.post('/api/auth/admin/update-user', { userId, data });
  },
};

export default authService;
