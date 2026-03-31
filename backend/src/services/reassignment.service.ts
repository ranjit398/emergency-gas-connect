// backend/src/services/reassignment.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Request Reassignment Service
// Handles re-requesting when helper doesn't respond/accept
// ─────────────────────────────────────────────────────────────────────────────

import EmergencyRequest, { IEmergencyRequest } from '@models/EmergencyRequest';
import ProviderService from '@services/ProviderService';
import logger from '@utils/logger';
import { notifyUser, broadcastActivity } from '@socket/handlers';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const setReassignmentIO = (socketServer: SocketIOServer) => {
  io = socketServer;
};

const MAX_REASSIGNMENTS = 3; // Maximum times to reassign per request
const REASSIGNMENT_TIMEOUT_MINUTES = 2; // Time to wait before reassigning

/**
 * Reassign request to a new helper
 * Called when:
 * - Seeker clicks "Request Again"
 * - Timeout for current assignment is reached
 */
export const requestAgain = async (
  requestId: string,
  seekerId: string,
  latitude?: number,
  longitude?: number
): Promise<IEmergencyRequest> => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.seekerId.toString() !== seekerId) {
    throw new Error('Only seeker can reassign their request');
  }

  if (request.status === 'completed' || request.status === 'cancelled') {
    throw new Error(`Cannot reassign a ${request.status} request`);
  }

  // Check reassignment limit
  const reassignmentCount = request.reassignmentCount || 0;
  if (reassignmentCount >= MAX_REASSIGNMENTS) {
    throw new Error(
      `Maximum reassignments (${MAX_REASSIGNMENTS}) reached. Please contact support.`
    );
  }

  // Reset to pending for new helpers to see
  request.status = 'pending';
  request.helperId = null;
  request.acceptedAt = undefined;
  request.inProgressAt = undefined;
  request.reassignmentCount = reassignmentCount + 1;
  request.assignedAt = new Date(); // Update assignment time

  // Update location if provided
  if (latitude !== undefined && longitude !== undefined) {
    request.location.coordinates = [longitude, latitude];
  }

  await request.save();

  if (io) {
    // Broadcast reassignment event
    broadcastActivity(io, {
      type: 'REQUEST_REASSIGNED',
      message: `Request reassigned (attempt ${request.reassignmentCount})`,
      requestId: request.id.toString(),
      timestamp: new Date(),
    });

    // Emit new_request event so helpers see it again
    io.emit('request:new', {
      requestId: request.id,
      status: 'pending',
      reassignmentCount: request.reassignmentCount,
      message: 'Request is looking for a helper again',
    });

    // Notify all connected providers
    io.emit('reassignment_available', {
      requestId: request.id,
      reassignmentCount: request.reassignmentCount,
    });
  }

  logger.info(
    `Request ${requestId} reassigned (count: ${request.reassignmentCount})`
  );
  return request;
};

/**
 * Auto-reassign if helper doesn't respond within timeout
 * Should be called by a cron job
 */
export const autoReassignUnresponsive = async (): Promise<number> => {
  const timeoutThreshold = new Date(
    Date.now() - REASSIGNMENT_TIMEOUT_MINUTES * 60 * 1000
  );

  // Find accepted requests that haven't moved to in_progress
  const unresponsive = await EmergencyRequest.find({
    status: 'accepted',
    acceptedAt: { $exists: true, $lt: timeoutThreshold },
    inProgressAt: { $exists: false },
  });

  let reassignedCount = 0;

  for (const request of unresponsive) {
    try {
      const reassignmentCount = request.reassignmentCount || 0;

      if (reassignmentCount >= MAX_REASSIGNMENTS) {
        // Mark as expired if too many reassignments
        request.status = 'expired';
        request.expiredAt = new Date();
      } else {
        // Auto-reassign
        request.status = 'pending';
        request.helperId = null;
        request.acceptedAt = undefined;
        request.reassignmentCount = reassignmentCount + 1;

        if (io) {
          notifyUser(io, request.seekerId.toString(), 'request:reassigned', {
            requestId: request.id.toString(),
            reason: 'Previous helper did not respond',
            message: 'Your request is now looking for another helper',
          });

          io.emit('request:new', {
            requestId: request.id,
            status: 'pending',
            reassignmentCount: request.reassignmentCount,
          });
        }

        logger.info(
          `Auto-reassigned request ${request.id} (count: ${request.reassignmentCount})`
        );
      }

      await request.save();
      reassignedCount++;
    } catch (error) {
      logger.error(`Error auto-reassigning request ${request.id}:`, error);
    }
  }

  return reassignedCount;
};

/**
 * Get reassignment history for a request
 */
export const getReassignmentHistory = async (requestId: string) => {
  const request = await EmergencyRequest.findById(requestId).populate('helperId');

  if (!request) {
    throw new Error('Request not found');
  }

  return {
    totalReassignments: request.reassignmentCount || 0,
    maxReassignments: MAX_REASSIGNMENTS,
    canReassign:
      request.reassignmentCount! < MAX_REASSIGNMENTS &&
      request.status !== 'completed' &&
      request.status !== 'cancelled',
    currentStatus: request.status,
    createdAt: request.createdAt,
    firstAcceptedAt: request.acceptedAt,
    currentHelper: request.helperId,
  };
};

/**
 * Check if request needs reassignment (helper is MIA)
 */
export const checkIfNeedsReassignment = async (
  requestId: string
): Promise<boolean> => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request || request.status !== 'accepted') {
    return false;
  }

  const timeSinceAccepted = Date.now() - request.acceptedAt!.getTime();
  const timeoutMillis = REASSIGNMENT_TIMEOUT_MINUTES * 60 * 1000;

  return timeSinceAccepted > timeoutMillis && !request.inProgressAt;
};

export default {
  setReassignmentIO,
  requestAgain,
  autoReassignUnresponsive,
  getReassignmentHistory,
  checkIfNeedsReassignment,
};
