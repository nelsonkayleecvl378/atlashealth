const env = require("../config/env");

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(message, 403);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(message, 404);
  }

  static conflict(message, details) {
    return new ApiError(message, 409, details);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(message, 429);
  }

  static internal(message = "Internal server error") {
    return new ApiError(message, 500);
  }
}

/**
 * Global error handler middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "An unexpected error occurred";
  let details = err.details || null;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = err.errors || err.message;
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (err.code === "ENOENT") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.name === "SyntaxError" && err.body) {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  // Log error in development or for server errors
  if (env.nodeEnv !== "production" || statusCode >= 500) {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  // Build response payload
  const payload = {
    success: false,
    error: {
      message,
      code: err.code || `ERR_${statusCode}`,
    },
  };

  // Include additional details in non-production
  if (env.nodeEnv !== "production") {
    payload.error.stack = err.stack;
    if (details) {
      payload.error.details = details;
    }
  }

  // Include request ID if available
  if (req.requestId) {
    payload.error.requestId = req.requestId;
  }

  res.status(statusCode).json(payload);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler helper
 */
const validationError = (errors) => {
  const error = new ApiError("Validation failed", 400);
  error.details = errors;
  return error;
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationError,
};


