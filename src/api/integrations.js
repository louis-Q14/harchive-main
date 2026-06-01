import { uploadService } from './uploadService.js';

// Re-export uploadFile for backward compatibility
export const UploadFile = async ({ file }) => {
  const result = await uploadService.uploadFile(file, 'documents');
  return { file_url: result.url };
};

// Stubs for unused integrations
export const InvokeLLM = async () => { throw new Error('InvokeLLM not available'); };
export const SendEmail = async () => { throw new Error('SendEmail not available'); };
export const SendSMS = async () => { throw new Error('SendSMS not available'); };
export const GenerateImage = async () => { throw new Error('GenerateImage not available'); };
export const ExtractDataFromUploadedFile = async () => { throw new Error('ExtractDataFromUploadedFile not available'); };






