/**
 * Backend Configuration
 * Switch between Base44 and local mock backend
 * 
 * Set USE_LOCAL_BACKEND=true to use local Node.js backend
 */

const USE_LOCAL_BACKEND = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';

export const backendConfig = {
  // Use local backend instead of Base44
  useLocalBackend: USE_LOCAL_BACKEND,

  // Local backend - empty string = same origin (Vite proxy routes /api → localhost:3099)
  localBackendUrl: import.meta.env.VITE_BASE44_BACKEND_URL || '',

  // Base44 configuration (fallback)
  base44Url: import.meta.env.VITE_BASE44_BACKEND_URL || 'https://api.base44.io',
  appId: import.meta.env.VITE_BASE44_APP_ID || 'harchive',

  // Get current API base URL
  getApiBaseUrl() {
    return this.useLocalBackend ? this.localBackendUrl : this.base44Url;
  },

  // Get auth endpoint
  getAuthUrl() {
    return this.useLocalBackend ? `${this.localBackendUrl}/api/auth` : `${this.base44Url}/auth`;
  },

  // Get app settings endpoint
  getAppSettingsUrl() {
    return this.useLocalBackend
      ? `${this.localBackendUrl}/api/apps/public/prod/public-settings/by-id/${this.appId}`
      : `${this.base44Url}/api/apps/public/prod/public-settings/by-id/${this.appId}`;
  },

  // Get entities endpoint
  getEntitiesUrl() {
    return this.useLocalBackend ? `${this.localBackendUrl}/api/entities` : `${this.base44Url}/entities`;
  }
};

export default backendConfig;
