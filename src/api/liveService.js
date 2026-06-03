// @ts-nocheck
/**
 * Live & Shorts API Service
 * Handles all API calls for live streaming and short videos
 */

import { backendConfig } from './backendConfig.js';

const getBaseUrl = () => backendConfig.useLocalBackend ? backendConfig.localBackendUrl + '/api' : '/api';

const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── Live Streams ──

export const liveService = {
  createStream: (data) =>
    fetchJSON(`${getBaseUrl()}/live/streams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getActiveStreams: () =>
    fetchJSON(`${getBaseUrl()}/live/streams`),

  getStream: (id) =>
    fetchJSON(`${getBaseUrl()}/live/streams/${id}`),

  endStream: (id) =>
    fetchJSON(`${getBaseUrl()}/live/streams/${id}/end`, { method: 'POST' }),

  getReplays: (limit = 20, offset = 0) =>
    fetchJSON(`${getBaseUrl()}/live/replays?limit=${limit}&offset=${offset}`),

  getChatHistory: (streamId, limit = 100) =>
    fetchJSON(`${getBaseUrl()}/live/streams/${streamId}/chat?limit=${limit}`),

  getWebSocketUrl: (streamId, role, token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = backendConfig.localBackendUrl
      ? backendConfig.localBackendUrl.replace(/^https?:/, protocol)
      : `${protocol}//${window.location.host}`;
    const url = `${wsBase}/ws/live?streamId=${streamId}&role=${role}`;
    return token ? `${url}&token=${encodeURIComponent(token)}` : url;
  },

  getWsTicket: () => fetchJSON(`${getBaseUrl()}/auth/ws-ticket`),
};

// ── Short Videos ──

export const shortsService = {
  create: (data) =>
    fetchJSON(`${getBaseUrl()}/shorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getFeed: (limit = 20, offset = 0) =>
    fetchJSON(`${getBaseUrl()}/shorts/feed?limit=${limit}&offset=${offset}`),

  getPublicFeed: (limit = 20, offset = 0) =>
    fetchJSON(`${getBaseUrl()}/shorts/public/feed?limit=${limit}&offset=${offset}`),

  getShort: (id) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}`),

  toggleLike: (id) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}/like`, { method: 'POST' }),

  recordView: (id) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}/view`, { method: 'POST' }),

  getComments: (id, limit = 50) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}/comments?limit=${limit}`),

  addComment: (id, contenu) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenu }),
    }),

  deleteShort: (id) =>
    fetchJSON(`${getBaseUrl()}/shorts/${id}`, { method: 'DELETE' }),

  getUserShorts: (userId) =>
    fetchJSON(`${getBaseUrl()}/shorts/user/${userId}`),
};
