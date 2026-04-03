// backend/src/services/requestLifecycle.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Request Lifecycle Management Service
// Handles status transitions, auto-expiration, and timeline tracking
// ─────────────────────────────────────────────────────────────────────────────

import EmergencyRequest, { IEmergencyRequest } from '@models/EmergencyRequest';
import logger from '@utils/logger';
import { broadcastActivity, notifyUser } from '@socket/handlers';
import { emitDashboardEvent, pushDashboardUpdate } from '@socket/dashboard.handler';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const setLifecycleIO = (socketServer: SocketIOServer) => {
  io = socketServer;
};

const REQUEST_EXPIRATION_MINUTES = 15; // Auto-expire after 15 minutes

/**
 * Transition request from pending → accepted
 * Records acceptedAt timestamp and calculates response time
 */
export const acceptRequest = async (
  requestId: string,
  helperId: string
): Promise<IEmergencyRequest> => {
  const request = await EmergencyRequest.findByIdAndUpdate(
    requestId,
    {
      $set: {
        status: 'accepted',
        helperId,
        acceptedAt: new Date(),
        assignedAt: new Date(),
      },
      $inc: { reassignmentCount: 0 }, // Already counted in reassignment
    },
    { new: true }
  );

  if (!request) {
    throw new Error('Request not found');
  }

  // Calculate response time in seconds
  const responseTime = Math.round(
    (request.acceptedAt!.getTime() - request.createdAt.getTime()) / 1000
  );
  request.helperResponseTime = responseTime;
  await request.save();

  // Notify all connected clients
  if (io) {
    io.emit('request:accepted', {
      requestId: request.id,
      helperId,
      status: 'accepted',
      acceptedAt: request.acceptedAt,
      seekerId: request.seekerId,
    });

    // Notify specific seeker
    notifyUser(io, request.seekerId.toString(), 'request:accepted', {
      requestId: request.id,
      message: 'Your request has been accepted!',
    });

    // Broadcast to activity feed
    broadcastActivity(io, {
      type: 'REQUEST_ACCEPTED',
      message: `Helper accepted request`,
      requestId: request.id.toString(),
      actorId: helperId,
      timestamp: new Date(),
    });


    if (request.providerId) {
      emitDashboardEvent(io, request.providerId.toString(), 'REQUEST_ACCEPTED', {
        requestId: request.id.toString(),
        helperId,
        status: 'accepted',
        acceptedAt: request.acceptedAt,
      });
  }

  logger.info(`Request ${requestId} accepted by helper ${helperId}`);
  return request;
};

/**
 * Transition request from accepted → in_progress
 * Helper is on the way / starting service
 */
export const markInProgress = async (
  requestId: string,
  helperId: string
): Promise<IEmergencyRequest> => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.helperId?.toString() !== helperId) {
    throw new Error('Only assigned helper can mark request as in progress');
  }

  request.status = 'in_progress';
  request.inProgressAt = new Date();
  await request.save();

  if (io) {
    io.emit('request:in_progress', {
      requestId: request.id,
      status: 'in_progress',
      seekerId: request.seekerId,
    });

    notifyUser(io, request.seekerId.toString(), 'request:in_progress', {
      requestId: request.id,
      message: 'Helper is on the way',
    });

    if (request.providerId) {
      emitDashboardEvent(io, request.providerId.toString(), 'REQUEST_IN_PROGRESS', {
        requestId: request.id.toString(),
        status: 'in_progress',
        inProgressAt: request.inProgressAt,
      });
    }
  }

  logger.info(`Request ${requestId} marked as in progress`);
  return request;
};

/**
 * Transition request from in_progress/accepted → completed
 * Records completion timestamp and calculates total time
 */
export const completeRequest = async (
  requestId: string,
  helperId: string
): Promise<IEmergencyRequest> => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.helperId?.toString() !== helperId) {
    throw new Error('Only assigned helper can complete request');
  }

  request.status = 'completed';
  request.completedAt = new Date();
  await request.save();

  if (io) {
    io.emit('request:completed', {
      requestId: request.id,
      status: 'completed',
      seekerId: request.seekerId,
      completedAt: request.completedAt,
    });

    notifyUser(io, request.seekerId.toString(), 'request:completed', {
      requestId: request.id,
      message: 'Your request has been completed. Please rate the service.',
    });

    broadcastActivity(io, {
      type: 'REQUEST_COMPLETED',
      message: `Request completed by helper`,
      requestId: request.id.toString(),
      actorId: request.helperId.toString(),
      timestamp: new Date(),
    });

    if (request.providerId) {
      emitDashboardEvent(io, request.providerId.toString(), 'REQUEST_COMPLETED', {
        requestId: request.id.toString(),
        helperId: request.helperId.toString(),
        status: 'completed',
        completedAt: request.completedAt,
      });
    }
  }

  logger.info(`Request ${requestId} completed by helper ${helperId}`);
  return request;
};

/**
 * Cancel request (seeker cancels before acceptance)
 */
export const cancelRequest = async (
  requestId: string,
  userId: string,
  userRole: string
): Promise<IEmergencyRequest> => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  if (userRole === 'seeker' && request.seekerId.toString() !== userId) {
    throw new Error('Only seeker can cancel their request');
  }

  request.status = 'cancelled';
  await request.save();

  if (io) {
    io.emit('request:cancelled', {
      requestId: request.id,
      status: 'cancelled',
    });

    if (request.helperId) {
      notifyUser(io, request.helperId.toString(), 'request:cancelled', {
        requestId: request.id,
        message: 'The request has been cancelled',
      });
    }

    if (request.providerId) {
      emitDashboardEvent(io, request.providerId.toString(), 'REQUEST_CANCELLED', {
        requestId: request.id.toString(),
        status: 'cancelled',
      });
    }
  }

  logger.info(`Request ${requestId} cancelled by user ${userId}`);
  return request;
};

/**
 * Auto-expire requests that haven't been accepted within X minutes
 * Run as a scheduled job
 */
export const autoExpireRequests = async (): Promise<number> => {
  const expirationTime = new Date(
    Date.now() - REQUEST_EXPIRATION_MINUTES * 60 * 1000
  );

  const result = await EmergencyRequest.updateMany(
    {
      status: 'pending',
      createdAt: { $lt: expirationTime },
    },
    {
      $set: {
        status: 'expired',
        expiredAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info(`Auto-expired ${result.modifiedCount} pending requests`);

    if (io) {
      io.emit('requests:auto_expired', {
        count: result.modifiedCount,
        timestamp: new Date(),
      });
    }
  }

  return result.modifiedCount || 0;
};

/**
 * Get request timeline
 */
export const getRequestTimeline = async (requestId: string) => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  const timeline = {
    created: request.createdAt,
    accepted: request.acceptedAt || null,
    inProgress: request.inProgressAt || null,
    completed: request.completedAt || null,
    expired: request.expiredAt || null,
    totalDuration:
      request.completedAt && request.createdAt
        ? Math.round(
            (request.completedAt.getTime() - request.createdAt.getTime()) / 1000
          )
        : null,
    responseTime: request.helperResponseTime || null,
  };

  return timeline;
};

export default {
  setLifecycleIO,
  acceptRequest,
  markInProgress,
  completeRequest,
  cancelRequest,
  autoExpireRequests,
  getRequestTimeline,
};
