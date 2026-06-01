/**
 * Upload Service
 * Handles file uploads to backend storage per user/category
 * 
 * Folder structure: uploads/{role}/{etablissement}/{user_id}/{category}/
 * Categories: profil, posts, galerie, documents
 */

import { backendConfig } from './backendConfig.js';

const getBaseUrl = () => backendConfig.useLocalBackend ? backendConfig.localBackendUrl + '/api' : '/api';

/**
 * Upload a single file
 * @param {File} file - File object from input
 * @param {string} category - profil | posts | galerie | documents
 * @returns {Promise<{url: string, name: string, size: number, mimetype: string, category: string}>}
 */
export const uploadFile = async (file, category = 'documents') => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getBaseUrl()}/upload/${category}`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur upload' }));
    throw new Error(err.error || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.file;
};

/**
 * Upload multiple files
 * @param {File[]} files - Array of File objects
 * @param {string} category - profil | posts | galerie | documents
 * @returns {Promise<Array<{url: string, name: string, size: number, mimetype: string, category: string}>>}
 */
export const uploadMultipleFiles = async (files, category = 'documents') => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const response = await fetch(`${getBaseUrl()}/upload/${category}/multiple`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Erreur upload' }));
    throw new Error(err.error || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.files;
};

/**
 * Upload a profile photo and update user record
 * @param {File} file
 * @returns {Promise<{url: string}>} The new photo URL
 */
export const uploadProfilePhoto = async (file) => {
  const uploaded = await uploadFile(file, 'profil');

  // Update user's photo_url
  const response = await fetch(`${getBaseUrl()}/auth/me`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ photo_url: uploaded.url })
  });

  if (!response.ok) {
    throw new Error('Failed to update profile photo');
  }

  return uploaded;
};

/**
 * List files in a category
 * @param {string} category
 * @returns {Promise<Array<{name: string, url: string, size: number, createdAt: string}>>}
 */
export const listFiles = async (category = 'documents') => {
  const response = await fetch(`${getBaseUrl()}/upload/${category}/list`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to list files');
  }

  const data = await response.json();
  return data.files;
};

/**
 * Delete a file
 * @param {string} category
 * @param {string} filename
 */
export const deleteUploadedFile = async (category, filename) => {
  const response = await fetch(`${getBaseUrl()}/upload/${category}/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }

  return response.json();
};

/**
 * Initialize user folders on the server
 */
export const initUserFolders = async () => {
  const response = await fetch(`${getBaseUrl()}/upload/init-folders`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to init folders');
  }

  return response.json();
};

export const uploadService = {
  uploadFile,
  uploadMultipleFiles,
  uploadProfilePhoto,
  listFiles,
  deleteFile: deleteUploadedFile,
  initUserFolders
};
