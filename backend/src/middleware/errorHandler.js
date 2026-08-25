const env = require('../config/env');

const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: `File is too large. Maximum size is ${env.cloudinary.maxFileSizeMb}MB.`,
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field in upload.',
  LIMIT_FILE_COUNT: 'Too many files in this upload.',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Multer's own errors (oversized file, wrong field name, etc.) extend
  // Error but never set statusCode/isOperational, so without this they
  // fall through to the generic "Something went wrong" 500 below —
  // exactly the opposite of the "clear validation error" file uploads
  // are supposed to return. Handled once, centrally, so every current
  // and future upload route (task/issue attachments, general files)
  // benefits without each one needing its own handling.
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: MULTER_ERROR_MESSAGES[err.code] || 'File upload failed.',
    });
  }

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    // Unexpected error — log full detail server-side, don't leak internals.
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Something went wrong. Please try again.',
    details: err.details || undefined,
    stack: env.isProduction ? undefined : err.stack,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
