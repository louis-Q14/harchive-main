/**
 * HTTP Client Abstraction Layer
 * This abstracts away from Base44's createAxiosClient
 * Can be swapped with custom backend later
 */

import axios from 'axios';
import { appParams } from '@/lib/app-params';
import { backendConfig } from './backendConfig.js';

/**
 * Create an HTTP client with optional authentication
 * @param {Object} config - Configuration object
 * @param {string} [config.baseURL] - Base URL for requests
 * @param {Object} [config.headers] - Additional headers
 * @param {string} [config.token] - Auth token
 * @returns {any} Configured axios instance
 */
export const createHttpClient = (config = {}) => {
  const {
    baseURL = `${appParams.serverUrl}/api`,
    headers = {},
    token = null,
  } = config;

  const client = axios.create({
    baseURL,
    timeout: 60000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': appParams.appId,
      ...headers,
    },
  });

  // Add auth token to requests if explicitly provided (non-cookie mode)
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Response interceptor: auto-refresh on 401 and retry once
  let isRefreshing = false;
  let refreshPromise = null;

  client.interceptors.response.use(
    (response) => response.data || response,
    async (error) => {
      const originalRequest = error.config;

      // If user is blocked (403 with blocked flag), redirect to blocked page
      if (error.response?.status === 403 && error.response?.data?.blocked) {
        if (window.location.pathname !== '/comptebloque') {
          window.location.href = '/comptebloque';
          return new Promise(() => {}); // never resolve — page is redirecting
        }
      }

      // If 401 and not already retrying and not the refresh endpoint itself
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        backendConfig.useLocalBackend &&
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/login')
      ) {
        originalRequest._retry = true;
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = axios.post(
            `${backendConfig.localBackendUrl}/api/auth/refresh`,
            {},
            { withCredentials: true }
          ).finally(() => { isRefreshing = false; });
        }
        try {
          await refreshPromise;
          // Retry original request with new cookie
          return client(originalRequest);
        } catch {
          // Refresh failed — user needs to log in again
        }
      }
      // Normalize error format
      const normalizedError = {
        status: error.response?.status,
        data: error.response?.data,
        message: error.response?.data?.message || error.message,
      };
      return Promise.reject(normalizedError);
    }
  );

  return client;
};

/**
 * Default API client for app requests
 */
export const apiClient = createHttpClient({
  baseURL: backendConfig.useLocalBackend ? backendConfig.localBackendUrl : `${appParams.serverUrl}/api`,
});
