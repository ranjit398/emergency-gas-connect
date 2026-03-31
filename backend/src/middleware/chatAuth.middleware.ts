// backend/src/middleware/chatAuth.middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
// Chat Authorization Middleware
// Ensures only seeker/helper can access request chat
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import EmergencyRequest from './models/EmergencyRequest';
import logger from './utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

/**
 * Middleware to validate chat access
 * Only seeker or assigned helper can chat
 */
export const validateChatAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { status: 401, message: 'Unauthorized' },
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: { status: 400, message: 'Request ID is required' },
      });
    }

    // Find request and verify user is participant
    const request = await EmergencyRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { status: 404, message: 'Request not found' },
      });
    }

    const isSeeker = request.seekerId.toString() === userId;
    const isHelper = request.helperId?.toString() === userId;

    // Only seeker or assigned helper can chat
    if (!isSeeker && !isHelper) {
      logger.warn(
        `Unauthorized chat access attempt: user=${userId}, requestId=${requestId}`
      );
      return res.status(403).json({
        success: false,
        error: {
          status: 403,
          message: 'You do not have access to this chat',
        },
      });
    }

    // Only allow chat if request is accepted or in progress
    if (request.status !== 'accepted' && request.status !== 'in_progress' && request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          status: 400,
          message: `Chat is not available for ${request.status} requests`,
        },
      });
    }

    // Attach request to res for downstream handlers
    (res as any).emergencyRequest = request;

    next();
  } catch (error) {
    logger.error('Chat auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: { status: 500, message: 'Internal server error' },
    });
  }
};

/**
 * Socket.IO middleware for chat room access
 */
export const validateChatSocketAccess = async (
  socket: any,
  next: (error?: any) => void
) => {
  try {
    const requestId = socket.handshake.auth?.requestId;
    const userId = socket.handshake.auth?.userId;

    if (!userId || !requestId) {
      return next(new Error('userId and requestId are required'));
    }

    // Find request
    const request = await EmergencyRequest.findById(requestId);

    if (!request) {
      return next(new Error('Request not found'));
    }

    // Verify user is participant
    const isSeeker = request.seekerId.toString() === userId;
    const isHelper = request.helperId?.toString() === userId;

    if (!isSeeker && !isHelper) {
      logger.warn(
        `Unauthorized socket chat access: user=${userId}, requestId=${requestId}`
      );
      return next(new Error('Unauthorized'));
    }

    // Verify request status
    if (
      request.status !== 'accepted' &&
      request.status !== 'in_progress' &&
      request.status !== 'completed'
    ) {
      return next(
        new Error(`Chat unavailable for ${request.status} requests`)
      );
    }

    // Attach request info to socket
    socket.requestId = requestId;
    socket.userId = userId;
    socket.userRole = isSeeker ? 'seeker' : 'helper';

    next();
  } catch (error) {
    logger.error('Socket chat auth error:', error);
    next(new Error('Authentication failed'));
  }
};

export default { validateChatAccess, validateChatSocketAccess };
