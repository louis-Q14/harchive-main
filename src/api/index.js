/**
 * API Services Index
 * Central exporter for all API abstraction services
 * 
 * Usage:
 * import { authService, dataService, functionService, socialService } from '@/api';
 */

export { authService } from './authService.js';
export { appSettingsService } from './appSettingsService.js';
export { dataService } from './dataService.js';
export { functionService } from './functionService.js';
export { socialService } from './socialService.js';
export { uploadService } from './uploadService.js';
export { liveService, shortsService } from './liveService.js';
export { backendConfig } from './backendConfig.js';
export { apiClient, createHttpClient } from './httpClient.js';
export { base44 } from './base44Client.js';
