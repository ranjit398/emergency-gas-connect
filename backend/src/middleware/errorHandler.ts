/**
 * Error handling middleware and custom error classes
 * Provides consistent error response format across API
 */

import { Request, Response, NextFunction } from 'express';
import config from '@config/index';
import logger from '@utils/logger';

/**
 * Interface for application errors
 */
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

/**
 * Async handler wrapper to catch unhandled promise rejections
 * Wraps async route handlers to automatically pass errors to error middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle all errors and return standardized response
 * 500 errors are logged with full details; client receives minimal info in production
 */
const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.name || 'INTERNAL_ERROR';

  // Log error details for debugging
  if (statusCode === 500) {
    logger.error('Unhandled server error:', {
      statusCode,
      message,
      code: errorCode,
      details: err.details,
      stack: err.stack,
    });
  } else if (config.nodeEnv === 'development') {
    logger.warn('Client error:', {
      statusCode,
      message,
      code: errorCode,
    });
  }

  // Return standardized error response
  res.status(statusCode).json({
    success: false,
    error: {
      statusCode,
      message,
      code: errorCode,
      ...(err.details && { details: err.details }),
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Validation Error - 400
 * Thrown when request data fails validation
 */
export class ValidationError extends Error {
  constructor(message: string, public statusCode = 400, public details?: any) {
    super(message);
    this.name = 'VALIDATION_ERROR';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not Found Error - 404
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found', public statusCode = 404) {
    super(message);
    this.name = 'NOT_FOUND_ERROR';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Unauthorized Error - 401
 * Thrown when authentication fails or token is invalid
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized', public statusCode = 401) {
    super(message);
    this.name = 'UNAUTHORIZED_ERROR';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden Error - 403
 * Thrown when user lacks required permissions or roles
 */
export class ForbiddenError extends Error {
  constructor(message = 'Forbidden', public statusCode = 403) {
    super(message);
    this.name = 'FORBIDDEN_ERROR';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Conflict Error - 409
 * Thrown when resource already exists or state conflicts
 */
export class ConflictError extends Error {
  constructor(message = 'Conflict', public statusCode = 409) {
    super(message);
    this.name = 'CONFLICT_ERROR';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Server Error - 500
 * Thrown for internal server errors
 */
export class ServerError extends Error {
  constructor(message = 'Internal Server Error', public statusCode = 500, public details?: any) {
    super(message);
    this.name = 'SERVER_ERROR';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export default errorHandler;
