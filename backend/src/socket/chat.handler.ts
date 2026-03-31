import { Server, Socket } from 'socket.io';
import chatService from './services/chat.service';
import { verifyToken } from './utils/jwt';
import { JWTPayload } from './types';
import logger from './utils/logger';


const onlineUsers = new Map<string, string>();

export function getOnlineUsers(): Map<string, string> {
  return onlineUsers;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function registerChatHandlers(io: Server, socket: any): void {
  const userId   = socket.userId as string;
  const userName = socket.userName as string ?? 'User';

  if (!userId) return;

  // Track online presence
  onlineUsers.set(userId, socket.id);

  // Broadcast online status to everyone
  socket.broadcast.emit('user:online', { userId, timestamp: new Date() });

  // ── join_room ─────────────────────────────────────────────────────────────
  socket.on('join_room', (data: { requestId: string }) => {
    if (!data?.requestId) return;
    const room = `chat:${data.requestId}`;
    socket.join(room);
    socket.emit('room:joined', { requestId: data.requestId, room });
    logger.debug(`[Chat] ${userId} joined room ${room}`);
  });

  // ── leave_room ────────────────────────────────────────────────────────────
  socket.on('leave_room', (data: { requestId: string }) => {
    if (!data?.requestId) return;
    socket.leave(`chat:${data.requestId}`);
  });

  // ── send_message ──────────────────────────────────────────────────────────
  socket.on('send_message', async (data: {
    requestId: string;
    receiverId: string;
    content: string;
    attachments?: string[];
    tempId?: string;   // client-side optimistic id
  }) => {
    if (!data?.requestId || !data?.content?.trim()) {
      socket.emit('message:error', { error: 'requestId and content are required' });
      return;
    }

    try {
      // Persist to MongoDB
      const saved = await chatService.saveMessage({
        requestId: data.requestId,
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content.trim(),
        attachments: data.attachments,
      });

      const payload = { ...saved, tempId: data.tempId };

      // Broadcast to everyone in the chat room (includes sender)
      io.to(`chat:${data.requestId}`).emit('receive_message', payload);

      // Also send to receiver's personal room if they're not in the chat room
      io.to(`user:${data.receiverId}`).emit('receive_message', payload);

      // Notification event for receiver
      io.to(`user:${data.receiverId}`).emit('notification:message', {
        from: userId,
        fromName: userName,
        requestId: data.requestId,
        preview: data.content.substring(0, 80),
        timestamp: saved.createdAt,
      });
    } catch (err) {
      logger.error('[Chat] send_message error:', err);
      socket.emit('message:error', { error: 'Failed to send message' });
    }
  });

  // ── typing ────────────────────────────────────────────────────────────────
  socket.on('typing', (data: { requestId: string; isTyping: boolean }) => {
    if (!data?.requestId) return;
    socket.to(`chat:${data.requestId}`).emit('typing', {
      userId,
      userName,
      isTyping: data.isTyping,
      timestamp: new Date(),
    });
  });

  // ── mark_read ─────────────────────────────────────────────────────────────
  socket.on('mark_read', async (data: { requestId: string }) => {
    if (!data?.requestId) return;
    try {
      const count = await chatService.markAllRead(data.requestId, userId);
      // Notify sender their messages were read
      socket.to(`chat:${data.requestId}`).emit('messages:read', {
        requestId: data.requestId,
        readBy: userId,
        count,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error('[Chat] mark_read error:', err);
    }
  });

  // ── Disconnect: remove from online map ───────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit('user:offline', { userId, timestamp: new Date() });
  });
}

// ── Standalone full socket setup (alternative approach) ──────────────────────
// Use this if you prefer to keep chat handlers completely separate
// Call setupChatSocket(io) ONCE from server.ts AFTER socketHandler(io)
export function setupChatSocket(io: Server): void {
  // Middleware already runs in main handlers.ts so socket.userId is set
  io.on('connection', (socket: any) => {
    if (!socket.userId) return; // Not authenticated
    registerChatHandlers(io, socket);
  });
}