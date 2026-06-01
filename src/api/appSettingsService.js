/**
 * Application Settings Service Abstraction Layer
 * Handles app configuration and public settings
 * Can be swapped with custom backend endpoint
 */

import { createHttpClient } from './httpClient';
import { backendConfig } from './backendConfig';
import { appParams } from '@/lib/app-params';

/**
 * App settings service - supports both Base44 and local backend
 */
export const appSettingsService = {
  /**
   * Get public settings for the app
   * @returns {Promise<Object>} App settings object
   */
  async getPublicSettings() {
    try {
      if (backendConfig.useLocalBackend) {
        // Use local backend endpoint
        const appClient = createHttpClient({
          baseURL: backendConfig.localBackendUrl,
          headers: {
            'X-App-Id': backendConfig.appId,
          },
        });

        const response = await appClient.get(
          `/api/apps/public/prod/public-settings/by-id/${backendConfig.appId}`
        );

        return response;
      } else {
        // Use Base44's official endpoint for app public settings
        const appClient = createHttpClient({
          baseURL: `${appParams.serverUrl}/api/apps/public`,
          headers: {
            'X-App-Id': appParams.appId,
          },
          token: appParams.token,
        });

        const response = await appClient.get(
          `/prod/public-settings/by-id/${appParams.appId}`
        );

        return response;
      }
    } catch (error) {
      // Normalize error format
      const normalizedError = {
        status: error.status,
        type: error.data?.extra_data?.reason || 'unknown',
        message: error.message,
        originalError: error,
      };

      // Handle specific error types
      if (normalizedError.status === 403) {
        if (normalizedError.type === 'auth_required') {
          throw {
            ...normalizedError,
            type: 'auth_required',
            message: 'Authentication required to access this app',
          };
        }
        if (normalizedError.type === 'user_not_registered') {
          throw {
            ...normalizedError,
            type: 'user_not_registered',
            message: 'User is not registered for this app',
          };
        }
      }

      throw normalizedError;
    }
  },
};

export default appSettingsService;
