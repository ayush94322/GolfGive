const { validationResult } = require('express-validator');
const logger = require('../../config/logger');

// ─── Centralised error handler ────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  logger.error(err);

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(402).json({ success: false, message: err.message, code: err.code });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ─── Validate express-validator results ──────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ─── 404 handler ─────────────────────────────────────────────────────────────
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

// ─── AppError helper class ────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, validate, notFound, AppError };
