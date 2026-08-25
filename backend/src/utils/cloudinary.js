const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');
const path = require('path');
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

// Explicit denylist, checked by extension regardless of what MIME type a
// client claims — a renamed .exe can still arrive with a generic
// 'application/octet-stream' content-type, which isn't in
// ALLOWED_MIME_TYPES anyway, but this makes the rejection reason
// unambiguous rather than relying solely on the allowlist's absence.
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.msi', '.com', '.scr', '.jar'];

const MAX_FILE_BYTES = env.cloudinary.maxFileSizeMb * 1024 * 1024;

/**
 * Never trust a client-provided filename as a storage identifier — it's
 * shown back to other users (in file lists, in Cloudinary's own
 * dashboard) and could otherwise carry path-traversal sequences, control
 * characters, or arbitrary length. Strips to a conservative charset and
 * caps length; the *original* filename is preserved separately in
 * PostgreSQL for display, this is only ever used to build the Cloudinary
 * public_id.
 */
function sanitizeFilenameForStorage(originalName) {
  const base = path.basename(originalName, path.extname(originalName));
  const safe = base
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return safe || 'file';
}

function assertSafeExtension(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw ApiError.badRequest(`File type not allowed: ${ext}`);
  }
}

/**
 * Uploads a file buffer (from multer's memoryStorage) to Cloudinary using
 * upload_stream, wrapped in a Promise. `resource_type: 'auto'` lets
 * Cloudinary route images vs raw documents correctly. The generated
 * public_id is a random prefix plus a sanitized version of the original
 * name — unguessable (can't be enumerated by trying sequential or
 * predictable IDs) while still being human-recognizable in Cloudinary's
 * own dashboard.
 */
function uploadBuffer(buffer, { folder, filename }) {
  if (!env.cloudinary.isConfigured) {
    throw ApiError.badRequest(
      'File storage is not configured on this server (missing Cloudinary credentials).'
    );
  }
  assertSafeExtension(filename);

  const publicId = `${crypto.randomBytes(8).toString('hex')}-${sanitizeFilenameForStorage(filename)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', public_id: publicId },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Deletes a Cloudinary resource. Cloudinary requires resource_type on
 * delete (it doesn't infer it from the public_id the way upload does),
 * which is exactly why migration 007 added a resource_type column
 * alongside public_id — deletion was structurally impossible without
 * both.
 */
async function deleteResource(publicId, resourceType = 'image') {
  if (!publicId) return { skipped: true };
  if (!env.cloudinary.isConfigured) return { skipped: true };
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  uploadBuffer,
  deleteResource,
  sanitizeFilenameForStorage,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS,
  MAX_FILE_BYTES,
};
