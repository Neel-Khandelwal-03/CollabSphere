const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const ApiError = require('./ApiError');

if (env.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Uploads a file buffer (from multer's memoryStorage) to Cloudinary using
 * upload_stream, wrapped in a Promise. `resource_type: 'auto'` lets
 * Cloudinary route images vs raw documents correctly.
 */
function uploadBuffer(buffer, { folder, filename }) {
  if (!env.cloudinary.isConfigured) {
    throw ApiError.badRequest(
      'File storage is not configured on this server (missing Cloudinary credentials).'
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', filename_override: filename, use_filename: true },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBuffer, ALLOWED_MIME_TYPES, MAX_FILE_BYTES };
