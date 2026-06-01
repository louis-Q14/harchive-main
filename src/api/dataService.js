/**
 * Data Service - Enhanced Abstraction Layer
 * Supports BOTH Base44 (legacy) and Local Backend
 * 
 * Automatically switches based on backendConfig
 * Provides unified interface for all entity CRUD operations
 */

import { base44 } from './base44Client';
import { backendConfig } from './backendConfig.js';
import { apiClient } from './httpClient.js';

/**
 * Enhanced data service with local backend support
 */
export const dataService = {
  /**
   * Query public publications (no auth required)
   */
  async queryPublicPublications({ limit = 200, offset = 0 } = {}) {
    if (backendConfig.useLocalBackend) {
      const response = await apiClient.get(`/api/public/publications?limit=${limit}&offset=${offset}`);
      return response.data || [];
    }
    return [];
  },

  /**
   * Query public etablissements agrees (no auth required)
   */
  async queryPublicEtablissements() {
    if (backendConfig.useLocalBackend) {
      const data = await apiClient.get('/api/public/etablissements-agrees');
      return Array.isArray(data) ? data : (data?.data || []);
    }
    return [];
  },

  /**
   * Query public academic structure for an establishment (no auth required)
   */
  async queryPublicStructure(etablissementId, nom) {
    if (backendConfig.useLocalBackend) {
      const params = nom ? `?nom=${encodeURIComponent(nom)}` : '';
      const data = await apiClient.get(`/api/public/structure/${etablissementId}${params}`);
      return data || {};
    }
    return {};
  },

  /**
   * Query entities with filters and pagination
   * @param {string} entityName - Name of entity (e.g., 'User', 'Classe', 'Matiere')
   * @param {{ filters?: Array, limit?: number, offset?: number, orderBy?: string }} [options] - Query options
   * @returns {Promise<Array>} Results
   */
  async query(entityName, { filters = [], limit = 50, offset = 0, orderBy } = {}) {
    try {

      if (backendConfig.useLocalBackend) {
        // Use local backend API
        const response = await apiClient.post(
          `/api/entities/${entityName}/query`,
          { filters, limit, offset, orderBy }
        );
        return response.data || [];
      } else {
        // Use Base44 (legacy)
        const query = base44.entities.Query[entityName];
        if (!query) {
          throw new Error(`Entity '${entityName}' not found in Base44`);
        }

        let builtQuery = query.filters(...filters);
        builtQuery = builtQuery.limit(limit).offset(offset);

        const results = await builtQuery.list();
        return results || [];
      }
    } catch (error) {
      console.error(`dataService.query error for ${entityName}:`, error);
      throw {
        status: error.status || 500,
        message: error.message || `Failed to query ${entityName}`,
        originalError: error,
      };
    }
  },

  /**
   * Get single entity by ID
   * @param {string} entityName - Entity name
   * @param {string} id - Entity ID
   * @returns {Promise<Object>} Entity object
   */
  async getById(entityName, id) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API
        const response = await apiClient.get(`/api/entities/${entityName}/${id}`);
        return response.data;
      } else {
        // Use Base44 (legacy)
        const query = base44.entities.Query[entityName];
        if (!query) {
          throw new Error(`Entity '${entityName}' not found`);
        }

        const result = await query.filters({ id }).getOne();
        return result;
      }
    } catch (error) {
      console.error(`dataService.getById error for ${entityName}:`, error);
      throw {
        status: error.status || 404,
        message: error.message || `${entityName} with id ${id} not found`,
        originalError: error,
      };
    }
  },

  /**
   * Create new entity (any type)
   * @param {string} entityName - Entity name
   * @param {Object} data - Entity data
   * @returns {Promise<Object>} Created entity
   */
  async create(entityName, data) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API
        const response = await apiClient.post(`/api/entities/${entityName}`, data);
        return response.data;
      } else {
        // Use Base44 (legacy)
        const mutation = base44.entities.Mutation[entityName];
        if (!mutation) {
          throw new Error(`Cannot create ${entityName}`);
        }

        const result = await mutation.create(data);
        return result;
      }
    } catch (error) {
      console.error(`dataService.create error for ${entityName}:`, error);
      throw {
        status: error.status || 400,
        message: error.message || `Failed to create ${entityName}`,
        originalError: error,
      };
    }
  },

  /**
   * Update entity
   * @param {string} entityName - Entity name
   * @param {string} id - Entity ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated entity
   */
  async update(entityName, id, data) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API
        const response = await apiClient.put(
          `/api/entities/${entityName}/${id}`,
          data
        );
        return response.data;
      } else {
        // Use Base44 (legacy)
        const mutation = base44.entities.Mutation[entityName];
        if (!mutation) {
          throw new Error(`Cannot update ${entityName}`);
        }

        const result = await mutation.update(id, data);
        return result;
      }
    } catch (error) {
      console.error(`dataService.update error for ${entityName}:`, error);
      throw {
        status: error.status || 400,
        message: error.message || `Failed to update ${entityName}`,
        originalError: error,
      };
    }
  },

  /**
   * Delete entity
   * @param {string} entityName - Entity name
   * @param {string} id - Entity ID
   * @returns {Promise<void>}
   */
  async delete(entityName, id) {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend API
        await apiClient.delete(`/api/entities/${entityName}/${id}`);
      } else {
        // Use Base44 (legacy)
        const mutation = base44.entities.Mutation[entityName];
        if (!mutation) {
          throw new Error(`Cannot delete ${entityName}`);
        }

        await mutation.delete(id);
      }
    } catch (error) {
      console.error(`dataService.delete error for ${entityName}:`, error);
      throw {
        status: error.status || 400,
        message: error.message || `Failed to delete ${entityName}`,
        originalError: error,
      };
    }
  },

  /**
   * Call a query method directly (for custom queries)
   * @param {string} entityName - Entity name
   * @returns {Object} Query builder object
   */
  getQueryBuilder(entityName) {
    const query = base44.entities.Query[entityName];
    if (!query) {
      throw new Error(`Entity '${entityName}' not found`);
    }
    return query;
  },

  /**
   * Call a mutation method directly (for custom mutations)
   * @param {string} entityName - Entity name
   * @returns {Object} Mutation builder object
   */
  getMutationBuilder(entityName) {
    const mutation = base44.entities.Mutation[entityName];
    if (!mutation) {
      throw new Error(`Cannot mutate ${entityName}`);
    }
    return mutation;
  },
};

export default dataService;
