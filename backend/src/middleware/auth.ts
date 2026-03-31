/**
 * Authentication and Authorization Middleware
 * Handles JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@config/index';
import { JWTPayload } from '@types';
import User from '@models/User';
import logger from '@utils/logger';
import { UnauthorizedError, ForbiddenError } from './errorHandler';

/**
 * Extend Express Request type with user information
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token and validates user status
 * 
 * Checks:
 * - Token is present and properly formatted
 * - Token is valid and not expired
 * - User still exists in database
 * - User account is active
 * 
 * @throws UnauthorizedError - If token is missing, invalid, or user inactive
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify and decode JWT
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (jwtErr: any) {
      const message =
        jwtErr.name === 'TokenExpiredError'
          ? 'Authentication token has expired'
          : 'Invalid authentication token';
      throw new UnauthorizedError(message);
    }

    // Verify user exists and is active in database
    const user = await User.findById(decoded.id)
      .select('email role isActive')
      .lean();

    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    // Attach user info to request for downstream handlers
    req.user = {
      id: user._id?.toString() || decoded.id,
      email: user.email,
      role: user.role,
    };
    req.userId = user._id?.toString() || decoded.id;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    logger.error('Authentication middleware error:', error);
    next(new UnauthorizedError('Authentication failed'));
  }
};

/**
 * Role-Based Access Control Middleware
 * Verifies user has required role(s)
 * 
 * @param roles - One or more allowed roles
 * @returns Middleware function
 * @throws ForbiddenError - If user role is not in allowed list
 * 
 * @example
 * router.put('/:id/accept', requireRole('helper'), handler);
 * router.delete('/:id', requireRole('admin', 'moderator'), handler);
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new ForbiddenError(
        `Insufficient permissions. Required role(s): ${roles.join(', ')}`
      );
      return next(error);
    }
    next();
  };
};

/**
 * Optional Authentication Middleware
 * Attempts to authenticate but doesn't fail if token is missing/invalid
 * Useful for public endpoints that have enhanced features for authenticated users
 * 
 * @example
 * router.get('/requests', optionalAuth, handler); // Works for both authenticated and public users
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // Only process if Authorization header exists
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        const user = await User.findById(decoded.id)
          .select('email role isActive')
          .lean();

        // Only attach user if account is still active
        if (user?.isActive) {
          req.user = {
            id: user._id?.toString() || decoded.id,
            email: user.email,
            role: user.role,
          };
          req.userId = user._id?.toString() || decoded.id;
        }
      } catch (jwtErr) {
        // Log but don't fail — token is optional
        logger.debug('Optional auth: Token validation failed', { error: jwtErr });
      }
    }
    
    next();
  } catch (error) {
    // Silent fail for optional auth
    logger.error('Optional auth middleware error:', error);
    next();
  }
};