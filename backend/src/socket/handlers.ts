import { Server, Socket } from 'socket.io';
import { JWTPayload } from '@types';
import { verifyToken } from '@utils/jwt';
import messageService from '@services/MessageService';
import { registerChatHandlers, getOnlineUsers } from '@socket/chat.handler';
import logger from '@utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export type ActivityEventType =
  | 'NEW_REQUEST' | 'REQUEST_ACCEPTED' | 'REQUEST_COMPLETED'
  | 'REQUEST_CANCELLED' | 'REQUEST_REASSIGNED' | 'HELPER_AVAILABLE' | 'HELPER_UNAVAILABLE'
  | 'NEW_MESSAGE' | 'PROVIDER_JOINED';

export interface ActivityEvent {
  type: ActivityEventType;
  message: string;
  actorId?: string;
  actorName?: string;
  requestId?: string;
  location?: string;
  cylinderType?: string;
  timestamp: Date;
  meta?: Record<string, any>;
}

export function broadcastActivity(io: Server, event: ActivityEvent): void {
  io.to('activity-feed').emit('activity:new', {
    ...event,
    timestamp: event.timestamp ?? new Date(),
  });
}

export function notifyUser(io: Server, userId: string, event: string, data: any): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function notifyRoom(io: Server, room: string, event: string, data: any): void {
  io.to(room).emit(event, data);
}

export const socketHandler = (io: Server): void => {
  // ── Auth middleware ──────────────────────────────────────────────────────
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error: no token'));
      const decoded = verifyToken(token) as JWTPayload;
      socket.userId   = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = (decoded as any).fullName ?? decoded.email ?? 'Unknown';
      next();
    } catch (error) {
      logger.warn('[Socket] Auth failed:', error);
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`[Socket] Connected: ${socket.userId} (${socket.userRole})`);

    socket.join(`user:${socket.userId}`);
    socket.join('activity-feed');

    if (socket.userRole === 'helper') socket.join('helpers');
    if (socket.userRole === 'provider') socket.join('providers');

    // ── NEW: Register chat handlers ──────────────────────────────────────
    registerChatHandlers(io, socket);

    // ── Room management ──────────────────────────────────────────────────
    socket.on('join:request', (requestId: string) => {
      socket.join(`request:${requestId}`);
      // Also join the chat room for this request
      socket.join(`chat:${requestId}`);
      socket.emit('request:joined', { requestId });
    });

    socket.on('leave:request', (requestId: string) => {
      socket.leave(`request:${requestId}`);
      socket.leave(`chat:${requestId}`);
    });

    // ── Legacy message:send (kept for backward compat) ────────────────────
    socket.on('message:send', async (data: {
      requestId: string;
      receiverId: string;
      content: string;
      attachments?: string[];
    }) => {
      try {
        const message = await messageService.sendMessage(
          data.requestId, socket.userId!,
          data.receiverId, data.content, data.attachments
        );
        io.to(`request:${data.requestId}`).emit('message:new', {
          id: message._id,
          requestId: data.requestId,
          senderId: socket.userId,
          receiverId: data.receiverId,
          content: message.content,
          createdAt: (message as any).createdAt,
        });
        notifyUser(io, data.receiverId, 'notification:message', {
          from: socket.userId,
          fromName: socket.userName,
          requestId: data.requestId,
          preview: message.content.substring(0, 80),
        });
      } catch (error) {
        socket.emit('message:error', { error: 'Failed to send message' });
        logger.error('[Socket] message:send error:', error);
      }
    });

    // ── Request lifecycle ────────────────────────────────────────────────
    socket.on('request:accepted', (data: {
      requestId: string; helperId: string;
      helperName: string; seekerId: string; estimatedArrivalMin?: number;
    }) => {
      io.to(`request:${data.requestId}`).emit('request:status-changed', {
        requestId: data.requestId, status: 'accepted',
        helperId: data.helperId, helperName: data.helperName, timestamp: new Date(),
      });
      notifyUser(io, data.seekerId, 'notification:request-accepted', {
        requestId: data.requestId, helperName: data.helperName,
        estimatedArrivalMin: data.estimatedArrivalMin,
      });
      broadcastActivity(io, {
        type: 'REQUEST_ACCEPTED',
        message: `${data.helperName} accepted an emergency request`,
        actorId: data.helperId, actorName: data.helperName,
        requestId: data.requestId, timestamp: new Date(),
      });
    });

    socket.on('request:completed', (data: { requestId: string }) => {
      io.to(`request:${data.requestId}`).emit('request:status-changed', {
        requestId: data.requestId, status: 'completed', timestamp: new Date(),
      });
      broadcastActivity(io, {
        type: 'REQUEST_COMPLETED',
        message: 'A gas delivery was completed successfully',
        requestId: data.requestId, timestamp: new Date(),
      });
    });

    // ── Typing (legacy — kept for RequestCard/Chat compat) ────────────────
    socket.on('typing:start', (data: { requestId: string }) => {
      socket.to(`request:${data.requestId}`).emit('typing:active', {
        userId: socket.userId, userName: socket.userName,
      });
    });
    socket.on('typing:stop', (requestId: string) => {
      socket.to(`request:${requestId}`).emit('typing:inactive', {
        userId: socket.userId,
      });
    });

    // ── Helper availability ──────────────────────────────────────────────
    socket.on('helper:available', (data: { address?: string }) => {
      broadcastActivity(io, {
        type: 'HELPER_AVAILABLE',
        message: 'A helper is now available to assist',
        actorId: socket.userId, actorName: socket.userName,
        location: data.address, timestamp: new Date(),
      });
    });

    // ── Location updates ─────────────────────────────────────────────────
    socket.on('location:update', (data: {
      requestId: string; latitude: number; longitude: number;
    }) => {
      io.to(`request:${data.requestId}`).emit('location:updated', {
        userId: socket.userId, latitude: data.latitude,
        longitude: data.longitude, timestamp: new Date(),
      });
    });

    // ── Provider dashboard subscription ──────────────────────────────────
    socket.on('provider:subscribe', (providerId: string) => {
      socket.join(`provider:${providerId}`);
      socket.emit('provider:subscribed', { providerId });
    });

    socket.on('provider:unsubscribe', (providerId: string) => {
      socket.leave(`provider:${providerId}`);
    });

    // ── Online status ─────────────────────────────────────────────────────
    socket.on('status:online', () => {
      io.to(`user:${socket.userId}`).emit('status:changed', {
        userId: socket.userId, status: 'online',
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Disconnected: ${socket.userId} — ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`[Socket] Error for ${socket.userId}:`, error);
    });
  });
};