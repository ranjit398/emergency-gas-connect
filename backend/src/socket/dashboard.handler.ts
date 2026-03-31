// backend/src/socket/dashboard.handler.ts
// Socket.IO handlers for real-time dashboard updates
// Emits events when requests are created, updated, or helper status changes

import { Server } from 'socket.io';
import logger from '@utils/logger';

/**
 * Emit dashboard update to all providers
 * Called when request status changes
 */
export const emitDashboardUpdate = (
  io: Server,
  event: {
    type: 'REQUEST_CREATED' | 'REQUEST_ACCEPTED' | 'REQUEST_COMPLETED' | 'REQUEST_CANCELLED' | 'REQUEST_REASSIGNED';
    providerId: string;
    requestId: string;
    helperId?: string;
    status?: string;
    data?: Record<string, any>;
  }
) => {
  try {
    // Broadcast to all connected providers
    io.to('providers').emit('dashboard_update', {
      type: event.type,
      providerId: event.providerId,
      requestId: event.requestId,
      helperId: event.helperId,
      status: event.status,
      timestamp: new Date().toISOString(),
      data: event.data,
    });

    logger.info(`[Dashboard] Emitted ${event.type} to providers`);
  } catch (error) {
    logger.error('[Dashboard] Failed to emit update:', error);
  }
};

/**
 * Emit request update to specific provider and room
 */
export const emitRequestUpdate = (
  io: Server,
  providerId: string,
  requestId: string,
  update: Record<string, any>
) => {
  try {
    // Emit to provider room
    io.to(`provider:${providerId}`).emit('request_updated', {
      requestId,
      ...update,
      timestamp: new Date().toISOString(),
    });

    // Also emit to request room for all listeners
    io.to(`request:${requestId}`).emit('request:updated', {
      requestId,
      ...update,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[Dashboard] Emitted request update for ${requestId}`);
  } catch (error) {
    logger.error('[Dashboard] Failed to emit request update:', error);
  }
};

/**
 * Emit helper availability change
 */
export const emitHelperUpdate = (
  io: Server,
  providerId: string,
  helperId: string,
  isAvailable: boolean
) => {
  try {
    io.to('providers').emit('helper_updated', {
      providerId,
      helperId,
      isAvailable,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[Dashboard] Emitted helper update: ${helperId} -> ${isAvailable}`);
  } catch (error) {
    logger.error('[Dashboard] Failed to emit helper update:', error);
  }
};

/**
 * Notify provider of new nearby request
 */
export const notifyProviderOfNearbyRequest = (
  io: Server,
  providerId: string,
  requestData: Record<string, any>
) => {
  try {
    io.to(`provider:${providerId}`).emit('nearby_request_alert', {
      ...requestData,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[Dashboard] Notified provider ${providerId} of nearby request`);
  } catch (error) {
    logger.error('[Dashboard] Failed to notify provider:', error);
  }
};
