// backend/src/socket/dashboard.handler.ts
// NEW — Handles provider room subscriptions + pushes live dashboard updates
// Call registerDashboardHandlers(io, socket) from main handlers.ts

import { Server, Socket } from 'socket.io';
import { getProviderDashboardStats } from '@services/providerDashboard.service';
import Provider from '@models/Provider';
import logger from '@utils/logger';

// ── Push a full dashboard snapshot to a provider room ────────────────────────
export async function pushDashboardUpdate(io: Server, userId: string) {
  try {
    const provider = await Provider.findOne({ userId });
    if (!provider) return;
    const providerId = provider._id.toString();

    const stats = await getProviderDashboardStats(userId);
    io.to(`provider:${providerId}`).emit('dashboard_update', {
      type: 'FULL_REFRESH',
      data: stats,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error('[Dashboard Socket] pushDashboardUpdate error:', err);
  }
}

// ── Emit a lightweight event (no DB refetch needed) ───────────────────────────
export function emitDashboardEvent(
  io: Server,
  providerId: string,
  type: string,
  payload: Record<string, any>
) {
  io.to(`provider:${providerId}`).emit('dashboard_update', {
    type,
    ...payload,
    timestamp: new Date(),
  });
}

// ── Register per-socket handlers ─────────────────────────────────────────────
export function registerDashboardHandlers(io: Server, socket: any) {
  const userId = socket.userId as string;
  if (!userId || socket.userRole !== 'provider') return;

  // Provider joins their own room on connect
  Provider.findOne({ userId })
    .then((provider) => {
      if (!provider) return;
      const providerId = provider._id.toString();
      socket.join(`provider:${providerId}`);
      socket.emit('provider:room_joined', { providerId });
      logger.debug(`[Dashboard] Provider ${userId} joined room provider:${providerId}`);
    })
    .catch(() => {});

  // Manual subscription (for when client explicitly wants to subscribe)
  socket.on('provider:subscribe', async (providerId: string) => {
    socket.join(`provider:${providerId}`);
    socket.emit('provider:subscribed', { providerId });
    // Send immediate snapshot
    try {
      const stats = await getProviderDashboardStats(userId);
      socket.emit('dashboard_update', { type: 'FULL_REFRESH', data: stats, timestamp: new Date() });
    } catch {}
  });

  socket.on('provider:unsubscribe', (providerId: string) => {
    socket.leave(`provider:${providerId}`);
  });

  // Client can request a manual refresh
  socket.on('dashboard:refresh', async () => {
    try {
      const stats = await getProviderDashboardStats(userId);
      socket.emit('dashboard_update', { type: 'FULL_REFRESH', data: stats, timestamp: new Date() });
    } catch (err) {
      socket.emit('dashboard_update', { type: 'ERROR', error: 'Refresh failed' });
    }
  });
}
