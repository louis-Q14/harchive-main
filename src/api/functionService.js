/**
 * Function Service
 * Handles backend function invocations (approvals, exports, etc.)
 * Transitions backend functions that Base44 provided
 */

import { backendConfig } from './backendConfig.js';
import { apiClient } from './httpClient.js';
import { base44 } from './base44Client.js';

/**
 * Service for invoking backend functions
 */
export const functionService = {
  /**
   * Invoke a backend function
   * @param {string} functionName - Name of function to invoke
   * @param {Object} params - Function parameters
   * @returns {Promise<any>} Function result
   */
  async invoke(functionName, params = {}) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API
        const response = await apiClient.post(
          `/api/functions/${functionName}`,
          params
        );
        return response.data;
      } else {
        // Use Base44 functions if available
        if (base44.functions && base44.functions[functionName]) {
          return await base44.functions[functionName](params);
        }
        throw new Error(`Function '${functionName}' not found in Base44`);
      }
    } catch (error) {
      console.error(`functionService.invoke error for ${functionName}:`, error);
      throw {
        status: error.status || 500,
        message: error.message || `Failed to invoke ${functionName}`,
        originalError: error,
      };
    }
  },

  // Convenient shorthand methods for common functions
  async approveInscription(inscriptionId, data = {}) {
    return this.invoke('approuverInscription', {
      inscriptionId,
      ...data,
    });
  },

  async rejectInscription(inscriptionId, reason = '') {
    return this.invoke('rejeterInscription', {
      inscriptionId,
      reason,
    });
  },

  async listAllUsers() {
    return this.invoke('listAllUsers');
  },

  async syncAllUsers() {
    return this.invoke('syncAllUsers');
  },

  async syncPresenceToStats() {
    return this.invoke('syncPresenceCopiesToStats');
  },

  async getStudentPhoto(studentId) {
    return this.invoke('getStudentPhoto', { studentId });
  },

  async notifyStudent(studentId, message) {
    return this.invoke('notifierEtudiant', { studentId, message });
  },

  async exportAffectations(params = {}) {
    return this.invoke('exportAffectations', params);
  },

  async exportMatieres(params = {}) {
    return this.invoke('exportMatieres', params);
  },

  async deleteAffectation(affectationId) {
    return this.invoke('deleteAffectation', { affectationId });
  },
};

export default functionService;
