// backend/src/services/realtimeDataSync.service.ts
// NEW — Real-time data synchronization service
// Watches database changes and broadcasts live updates via Socket.IO

import { Server } from 'socket.io';
import mongoose from 'mongoose';
import EmergencyRequest from '@models/EmergencyRequest';
import Provider from '@models/Provider';
import Profile from '@models/Profile';
import Rating from '@models/Rating';
import Message from '@models/Message';
import { getProviderLiveData, getHelperLiveData, getSeekerLiveData } from '@services/LiveDataService';
import logger from '@utils/logger';

let io: Server | null = null;
const activeRefreshTimers = new Map<string, NodeJS.Timeout>();

/**
 * Initialize real-time data sync with Socket.IO instance
 */
export function initializeRealtimeSync(socketIOInstance: Server) {
  io = socketIOInstance;
  setupChangeStreams();
  logger.info('[RealtimeSync] Initialized');
}

/**
 * Setup MongoDB change streams to watch for updates
 */
function setupChangeStreams() {
  if (!io) return;

  // Watch Emergency Requests for changes
  const requestStream = EmergencyRequest.collection.watch();
  requestStream.on('change', async (change: any) => {
    try {
      const fullDoc = change.fullDocument || change.documentKey;
      if (!fullDoc) return;

      const requestId = fullDoc._id?.toString() || change.documentKey._id?.toString();
      const providerId = fullDoc.providerId?.toString();
      const helperId = fullDoc.helperId?.toString();
      const seekerId = fullDoc.seekerId?.toString();

      // Notify provider
      if (providerId) {
        scheduleDataPush(providerId, 'provider', 2000);
      }

      // Notify helper
      if (helperId) {
        scheduleDataPush(helperId.toString(), 'helper', 2000);
      }

      // Notify seeker
      if (seekerId) {
        scheduleDataPush(seekerId.toString(), 'seeker', 2000);
      }

      // Broadcast activity to all
      if (change.operationType === 'update' || change.operationType === 'insert') {
        io!.to('activity-feed').emit('live:data-changed', {
          type: 'REQUEST_CHANGE',
          requestId,
          status: fullDoc.status,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      logger.error('[RealtimeSync] Request stream error:', err);
    }
  });

  // Watch Provider for inventory/profile changes
  const providerStream = Provider.collection.watch();
  providerStream.on('change', async (change: any) => {
    try {
      const fullDoc = change.fullDocument || change.documentKey;
      const providerId = fullDoc._id?.toString();

      if (providerId && change.operationType === 'update') {
        // Check if inventory changed
        const updatedFields = change.updateDescription?.updatedFields || {};
        if (Object.keys(updatedFields).some(key => key.includes('availableCylinders'))) {
          io!.to(`provider:${providerId}`).emit('inventory:updated', {
            inventory: fullDoc.availableCylinders,
            timestamp: new Date(),
          });
        }
        scheduleDataPush(providerId, 'provider', 1000);
      }
    } catch (err) {
      logger.error('[RealtimeSync] Provider stream error:', err);
    }
  });

  // Watch Ratings for real-time updates
  const ratingStream = Rating.collection.watch();
  ratingStream.on('change', async (change: any) => {
    try {
      const fullDoc = change.fullDocument || change.documentKey;
      if (!fullDoc || change.operationType !== 'insert') return;

      const providerId = fullDoc.providerId?.toString();
      const toUserId = fullDoc.toUserId?.toString();

      if (providerId) {
        scheduleDataPush(providerId, 'provider', 2000);
      }
      if (toUserId) {
        scheduleDataPush(toUserId, 'helper', 2000);
      }
    } catch (err) {
      logger.error('[RealtimeSync] Rating stream error:', err);
    }
  });

  // Watch Messages for new messages
  const messageStream = Message.collection.watch();
  messageStream.on('change', async (change: any) => {
    try {
      if (change.operationType !== 'insert') return;

      const fullDoc = change.fullDocument;
      const receiverId = fullDoc.receiverId?.toString();

      if (receiverId) {
        io!.to(`user:${receiverId}`).emit('message:new', {
          id: fullDoc._id.toString(),
          from: fullDoc.senderId.toString(),
          content: fullDoc.content,
          timestamp: fullDoc.createdAt,
        });
        // Schedule light refresh
        scheduleDataPush(receiverId, null, 3000);
      }
    } catch (err) {
      logger.error('[RealtimeSync] Message stream error:', err);
    }
  });

  logger.info('[RealtimeSync] Change streams initialized');
}

/**
 * Schedule data push with debouncing (prevents flood of updates)
 */
function scheduleDataPush(userId: string, role: 'provider' | 'helper' | 'seeker' | null, delayMs = 2000) {
  if (!io) return;

  const key = `${userId}:${role || 'any'}`;

  // Clear existing timer
  if (activeRefreshTimers.has(key)) {
    clearTimeout(activeRefreshTimers.get(key)!);
  }

  // Schedule new push
  const timer = setTimeout(async () => {
    try {
      if (!io) return;

      // Determine actual role if not provided
      let actualRole = role;
      if (!actualRole) {
        // Try provider first
        const provider = await Provider.findOne({ userId });
        if (provider) actualRole = 'provider';
        else {
          // Check if helper/seeker
          const profile = await Profile.findOne({ userId });
          actualRole = profile ? 'helper' : 'seeker';
        }
      }

      // Fetch fresh data
      let data;
      try {
        if (actualRole === 'provider') {
          data = await getProviderLiveData(userId);
        } else if (actualRole === 'helper') {
          data = await getHelperLiveData(userId);
        } else {
          data = await getSeekerLiveData(userId);
        }

        // Push to user's socket room
        io!.to(`user:${userId}`).emit('live:data-refresh', {
          type: 'FULL_REFRESH',
          data,
          timestamp: new Date(),
        });

        // For providers, also push to provider room
        if (actualRole === 'provider') {
          const provider = await Provider.findOne({ userId });
          if (provider) {
            io!.to(`provider:${provider._id.toString()}`).emit('dashboard_update', {
              type: 'FULL_REFRESH',
              data,
              timestamp: new Date(),
            });
          }
        }

        logger.debug(`[RealtimeSync] Pushed data to ${userId} (role: ${actualRole})`);
      } catch (err) {
        logger.error(`[RealtimeSync] Failed to push data for ${userId}:`, err);
      }
    } finally {
      activeRefreshTimers.delete(key);
    }
  }, delayMs);

  activeRefreshTimers.set(key, timer);
}

/**
 * Manually trigger data push (used by controllers after significant changes)
 */
export async function triggerLiveDataRefresh(userId: string, role?: 'provider' | 'helper' | 'seeker') {
  scheduleDataPush(userId, role || null, 500); // Quick push
}

/**
 * Broadcast data to a specific room
 */
export function broadcastRealtimeUpdate(room: string, event: string, data: any) {
  if (!io) return;
  io.to(room).emit(event, {
    ...data,
    timestamp: new Date(),
  });
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRealtimeSync() {
  // Clear all timers
  activeRefreshTimers.forEach(timer => clearTimeout(timer));
  activeRefreshTimers.clear();
  logger.info('[RealtimeSync] Cleaned up');
}

export default {
  initializeRealtimeSync,
  triggerLiveDataRefresh,
  broadcastRealtimeUpdate,
  cleanupRealtimeSync,
};
