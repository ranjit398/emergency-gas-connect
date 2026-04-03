// backend/src/socket/handlers.ts
// UPDATED — adds dashboard handler + request lifecycle socket events
// All existing events preserved

import { Server, Socket } from 'socket.io';
import { verifyToken } from '@utils/jwt';
import { JWTPayload } from '@types';
import messageService from '@services/MessageService';
import { registerChatHandlers } from '@socket/chat.handler';
import { registerDashboardHandlers, pushDashboardUpdate, emitDashboardEvent } from '@socket/dashboard.handler';
import logger from '@utils/logger';

interface AuthSocket extends Socket {
  userId?: string; userRole?: string; userName?: string;
}

export type ActivityEventType =
  | 'NEW_REQUEST' | 'REQUEST_ACCEPTED' | 'REQUEST_COMPLETED'
  | 'REQUEST_CANCELLED' | 'HELPER_AVAILABLE' | 'NEW_MESSAGE' | 'PROVIDER_JOINED';

export interface ActivityEvent {
  type: ActivityEventType; message: string;
  actorId?: string; actorName?: string; requestId?: string;
  location?: string; cylinderType?: string; timestamp: Date;
  meta?: Record<string, any>;
}

export function broadcastActivity(io: Server, event: ActivityEvent) {
  io.to('activity-feed').emit('activity:new', { ...event, timestamp: event.timestamp ?? new Date() });
}

export function notifyUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

// ── Exported so EmergencyRequestService can call these ───────────────────────
export async function notifyProviderOnRequestChange(
  io: Server,
  providerId: string | null | undefined,
  providerUserId: string | null | undefined,
  type: string,
  payload: Record<string, any>
) {
  if (!providerId) return;
  emitDashboardEvent(io, providerId.toString(), type, payload);
  // Also push full refresh after short delay
  if (providerUserId) {
    setTimeout(() => pushDashboardUpdate(io, providerUserId.toString()), 800);
  }
}

export const socketHandler = (io: Server): void => {
  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = verifyToken(token) as JWTPayload;
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = (decoded as any).fullName ?? decoded.email ?? 'Unknown';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    logger.info(`[Socket] Connected: ${socket.userId} (${socket.userRole})`);

    socket.join(`user:${socket.userId}`);
    socket.join('activity-feed');
    if (socket.userRole === 'helper') socket.join('helpers');
    if (socket.userRole === 'provider') socket.join('providers');

    // ── Register sub-handlers ──────────────────────────────────────────────
    registerChatHandlers(io, socket);
    registerDashboardHandlers(io, socket);

    // ── Room management ────────────────────────────────────────────────────
    socket.on('join:request', (requestId: string) => {
      socket.join(`request:${requestId}`);
      socket.join(`chat:${requestId}`);
      socket.emit('request:joined', { requestId });
    });
    socket.on('leave:request', (requestId: string) => {
      socket.leave(`request:${requestId}`);
      socket.leave(`chat:${requestId}`);
    });

    // ── Request lifecycle (emitted by controllers/services) ────────────────
    socket.on('request:accepted', (data: {
      requestId: string; helperId: string; helperName: string;
      seekerId: string; providerId?: string; estimatedArrivalMin?: number;
    }) => {
      io.to(`request:${data.requestId}`).emit('request:status-changed', {
        requestId: data.requestId, status: 'accepted',
        helperId: data.helperId, helperName: data.helperName, timestamp: new Date(),
      });
      notifyUser(io, data.seekerId, 'notification:request-accepted', {
        requestId: data.requestId, helperName: data.helperName,
        estimatedArrivalMin: data.estimatedArrivalMin,
      });
      // Provider dashboard update
      if (data.providerId) {
        emitDashboardEvent(io, data.providerId, 'REQUEST_ACCEPTED', {
          requestId: data.requestId, helperName: data.helperName,
          message: `${data.helperName} accepted a request`,
        });
      }
      broadcastActivity(io, {
        type: 'REQUEST_ACCEPTED',
        message: `${data.helperName} accepted an emergency request`,
        actorId: data.helperId, actorName: data.helperName,
        requestId: data.requestId, timestamp: new Date(),
      });
    });

    socket.on('request:completed', (data: { requestId: string; providerId?: string }) => {
      io.to(`request:${data.requestId}`).emit('request:status-changed', {
        requestId: data.requestId, status: 'completed', timestamp: new Date(),
      });
      if (data.providerId) {
        emitDashboardEvent(io, data.providerId, 'REQUEST_COMPLETED', {
          requestId: data.requestId,
          message: 'A delivery was completed successfully',
        });
      }
      broadcastActivity(io, {
        type: 'REQUEST_COMPLETED',
        message: 'Gas delivery completed', requestId: data.requestId, timestamp: new Date(),
      });
    });

    // ── Legacy message:send ────────────────────────────────────────────────
    socket.on('message:send', async (data: {
      requestId: string; receiverId: string; content: string;
    }) => {
      try {
        const message = await messageService.sendMessage(
          data.requestId, socket.userId!, data.receiverId, data.content
        );
        io.to(`request:${data.requestId}`).emit('message:new', {
          id: message._id, requestId: data.requestId,
          senderId: socket.userId, content: message.content,
          createdAt: (message as any).createdAt,
        });
      } catch { socket.emit('message:error', { error: 'Failed to send' }); }
    });

    // ── Typing ─────────────────────────────────────────────────────────────
    socket.on('typing:start', (data: { requestId: string }) => {
      socket.to(`request:${data.requestId}`).emit('typing:active', { userId: socket.userId, userName: socket.userName });
    });
    socket.on('typing:stop', (requestId: string) => {
      socket.to(`request:${requestId}`).emit('typing:inactive', { userId: socket.userId });
    });

    // ── Helper availability ────────────────────────────────────────────────
    socket.on('helper:available', (data: { address?: string }) => {
      broadcastActivity(io, {
        type: 'HELPER_AVAILABLE', message: 'A helper is now available',
        actorId: socket.userId, actorName: socket.userName,
        location: data.address, timestamp: new Date(),
      });
    });

    // ── Status ─────────────────────────────────────────────────────────────
    socket.on('status:online', () => {
      io.to(`user:${socket.userId}`).emit('status:changed', { userId: socket.userId, status: 'online' });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Disconnected: ${socket.userId} — ${reason}`);
    });
  });
};