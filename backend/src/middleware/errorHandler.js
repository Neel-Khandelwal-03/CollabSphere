const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
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
