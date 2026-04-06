import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import EmergencyRequest, { IEmergencyRequest } from '@models/EmergencyRequest';
import Profile from '@models/Profile';
import User from '@models/User';
import { NotFoundError, ValidationError } from '@middleware/errorHandler';
import { calculatePriorityScore, getPriorityLevel } from '@services/priority.service';
import { broadcastActivity } from '@socket/handlers';
import { emitDashboardEvent, pushDashboardUpdate } from '@socket/dashboard.handler';
import { deductInventoryOnComplete } from '@services/providerDashboard.service';
import Provider from '@models/Provider';
import logger from '@utils/logger';

let _io: SocketServer | null = null;
export function setSocketIO(io: SocketServer) { _io = io; }

// ── Aggregation pipeline that joins User + Profile for fullName ──────────────
// This is the key fix: seekerId/helperId are User refs, but fullName is in Profile
const REQUEST_LOOKUP_PIPELINE = [
  // Join seeker's Profile
  {
    $lookup: {
      from: 'profiles',
      localField: 'seekerId',
      foreignField: 'userId',
      as: '_seekerProfile',
    },
  },
  // Join helper's Profile (if exists)
  {
    $lookup: {
      from: 'profiles',
      localField: 'helperId',
      foreignField: 'userId',
      as: '_helperProfile',
    },
  },
  // Join seeker's User (for email)
  {
    $lookup: {
      from: 'users',
      localField: 'seekerId',
      foreignField: '_id',
      as: '_seekerUser',
    },
  },
  // Join helper's User (for email)
  {
    $lookup: {
      from: 'users',
      localField: 'helperId',
      foreignField: '_id',
      as: '_helperUser',
    },
  },
  // Shape into clean seeker/helper objects
  {
    $addFields: {
      seeker: {
        $let: {
          vars: {
            sp: { $arrayElemAt: ['$_seekerProfile', 0] },
            su: { $arrayElemAt: ['$_seekerUser', 0] },
          },
          in: {
            id: '$seekerId',
            email: '$$su.email',
            fullName: '$$sp.fullName',
            phone: '$$sp.phone',
            avatarUrl: '$$sp.avatarUrl',
            role: '$$su.role',
          },
        },
      },
      helper: {
        $cond: {
          if: { $gt: ['$helperId', null] },
          then: {
            $let: {
              vars: {
                hp: { $arrayElemAt: ['$_helperProfile', 0] },
                hu: { $arrayElemAt: ['$_helperUser', 0] },
              },
              in: {
                id: '$helperId',
                email: '$$hu.email',
                fullName: '$$hp.fullName',
                phone: '$$hp.phone',
                avatarUrl: '$$hp.avatarUrl',
                role: '$$hu.role',
              },
            },
          },
          else: null,
        },
      },
    },
  },
  // Clean up temp fields
  {
    $project: {
      _seekerProfile: 0,
      _helperProfile: 0,
      _seekerUser: 0,
      _helperUser: 0,
    },
  },
];

// ── Helper to normalize _id → id in aggregation results ─────────────────────
function normalizeId(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj._id && !obj.id) obj.id = obj._id.toString();
  return obj;
}

export class EmergencyRequestService {

  // ── GET SINGLE with full name population ──────────────────────────────────
  async getRequest(requestId: string): Promise<any> {
    const results = await EmergencyRequest.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(requestId) } },
      ...REQUEST_LOOKUP_PIPELINE,
    ]);

    if (!results || results.length === 0) {
      throw new NotFoundError('Request not found');
    }

    const doc = results[0];
    doc.id = doc._id.toString();
    return doc;
  }

  // ── CREATE ─────────────────────────────────────────────────────────────────
  async createRequest(
    seekerId: string,
    { cylinderType, quantity, message, latitude, longitude, address }: {
      cylinderType: string; quantity: number; message?: string;
      latitude: number; longitude: number; address: string;
    }
  ): Promise<any> {
    const createdAt = new Date();
    const priorityScore = calculatePriorityScore({ message, createdAt });
    const priorityLevel = getPriorityLevel(priorityScore);

    const request = await EmergencyRequest.create({
      seekerId, cylinderType, quantity, message,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address, priorityScore, priorityLevel,
    });

    // Fetch with full population for socket broadcast
    const full = await this.getRequest(request._id.toString());

    logger.info(`[Request] Created ${request._id} — ${priorityLevel} (${priorityScore})`);

    if (_io) {
      _io.to('helpers').emit('request:new', full);
      
      if (full.providerId) {
        emitDashboardEvent(_io, full.providerId.toString(), 'REQUEST_CREATED', {
          requestId: full.id.toString(),
          status: 'pending',
          cylinderType: full.cylinderType,
          address: full.address,
          priorityLevel: full.priorityLevel,
        });
      }

      broadcastActivity(_io, {
        type: 'NEW_REQUEST',
        message: `New ${cylinderType} emergency request in ${address.split(',')[0]}`,
        requestId: request._id.toString(),
        cylinderType,
        location: address.split(',')[0],
        timestamp: new Date(),
        meta: { priorityLevel, priorityScore },
      });
    }

    return full;
  }

  // ── GET USER REQUESTS ──────────────────────────────────────────────────────
  async getUserRequests(
    userId: string, role: string, page = 1, limit = 20
  ): Promise<{ requests: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const matchFilter: any = {};
    if (role === 'seeker')   matchFilter.seekerId = new mongoose.Types.ObjectId(userId);
    else if (role === 'helper') matchFilter.helperId = new mongoose.Types.ObjectId(userId);
    else if (role === 'provider') matchFilter.providerId = new mongoose.Types.ObjectId(userId);

    const [results, total] = await Promise.all([
      EmergencyRequest.aggregate([
        { $match: matchFilter },
        { $sort: { priorityScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        ...REQUEST_LOOKUP_PIPELINE,
        {
          $addFields: {
            id: { $toString: '$_id' },
          },
        },
      ]),
      EmergencyRequest.countDocuments(matchFilter),
    ]);

    return { requests: results, total };
  }

  // ── GET PENDING ────────────────────────────────────────────────────────────
  async getPendingRequests(
    latitude: number, longitude: number,
    maxDistance = 15, limit = 20
  ): Promise<any[]> {
    const results = await EmergencyRequest.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distanceMeters',
          maxDistance: maxDistance * 1000,
          spherical: true,
          query: { status: 'pending' },
        },
      },
      { $sort: { priorityScore: -1 } },
      { $limit: limit },
      ...REQUEST_LOOKUP_PIPELINE,
      {
        $addFields: {
          id: { $toString: '$_id' },
          distanceKm: { $divide: ['$distanceMeters', 1000] },
        },
      },
    ]);

    return results;
  }

  // ── ACCEPT ─────────────────────────────────────────────────────────────────
  async acceptRequest(requestId: string, helperId: string): Promise<any> {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) throw new NotFoundError('Request not found');
    if (request.status !== 'pending') throw new ValidationError('Request is not pending');
    if (request.helperId) throw new ValidationError('Request already accepted');

    const acceptedAt = new Date();
    request.helperId  = helperId as any;
    request.status    = 'accepted' as any;
    request.assignedAt = acceptedAt;
    // ✅ DO NOT auto-assign provider here - keep as null
    // Nearby Emergencies card works with null providerId
    // This allows ANY provider to see and claim it

    await request.save();
    logger.info(`[Request] Accepted by helper ${helperId} - requestId: ${requestId}`);

    // Update helper response time
    try {
      const helperProfile = await Profile.findOne({ userId: helperId });
      if (helperProfile) {
        const mins = Math.floor((acceptedAt.getTime() - request.createdAt.getTime()) / 60_000);
        (helperProfile as any).recordResponseTime?.(mins);
      }
    } catch (e) {
      logger.warn('[Request] Could not update helper response time:', e);
    }

    const full = await this.getRequest(requestId);

    if (_io) {
      const helperName = full.helper?.fullName ?? 'A helper';
      
      // Broadcast to ALL providers to refresh their dashboards
      logger.info(`[Request] Broadcasting refresh to all providers after acceptance`);
      _io.emit('dashboard_refresh_trigger', {
        reason: 'REQUEST_ACCEPTED',
        timestamp: acceptedAt,
      });
      
      _io.to(`request:${requestId}`).emit('request:status-changed', {
        requestId, status: 'accepted', helperId, helperName, timestamp: acceptedAt,
      });
      _io.to(`user:${request.seekerId}`).emit('notification:request-accepted', {
        requestId, helperName, timestamp: acceptedAt,
      });
      broadcastActivity(_io, {
        type: 'REQUEST_ACCEPTED',
        message: `${helperName} is on the way to help`,
        actorId: helperId, actorName: helperName,
        requestId, cylinderType: request.cylinderType,
        location: request.address.split(',')[0],
        timestamp: acceptedAt,
      });
    }

    return full;
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  async completeRequest(requestId: string, rating?: number, review?: string): Promise<any> {
    const request = await EmergencyRequest.findByIdAndUpdate(
      requestId,
      { status: 'completed', completedAt: new Date(), ...(rating && { rating }), ...(review && { review }) },
      { new: true }
    );
    if (!request) throw new NotFoundError('Request not found');

    if (request.helperId) {
      await Profile.findOneAndUpdate(
        { userId: request.helperId },
        { $inc: { completedRequests: 1 } }
      );
    }

    // ── Auto-deduct inventory when request completes ────────────────────────
    if (request.providerId) {
      try {
        await deductInventoryOnComplete(
          request.providerId.toString(),
          request.cylinderType as 'LPG' | 'CNG',
          request.quantity ?? 1
        );
      } catch (err) {
        logger.warn(`[Inventory] Failed to deduct for request ${requestId}:`, err);
        // Don't throw - allow request to complete even if inventory fails
      }
    }

    const full = await this.getRequest(requestId);

    if (_io) {
      _io.to(`request:${requestId}`).emit('request:status-changed', {
        requestId, status: 'completed', timestamp: new Date(),
      });
      broadcastActivity(_io, {
        type: 'REQUEST_COMPLETED',
        message: 'Gas delivery completed successfully',
        requestId, cylinderType: request.cylinderType,
        timestamp: new Date(), meta: { rating },
      });
    }

    return full;
  }

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  async cancelRequest(requestId: string): Promise<any> {
    const request = await EmergencyRequest.findByIdAndUpdate(
      requestId, { status: 'cancelled' }, { new: true }
    );
    if (!request) throw new NotFoundError('Request not found');

    const full = await this.getRequest(requestId);

    if (_io) {
      _io.to(`request:${requestId}`).emit('request:status-changed', {
        requestId, status: 'cancelled', timestamp: new Date(),
      });
    }

    return full;
  }

  // ── STATS ──────────────────────────────────────────────────────────────────
  async getStats(userId: string) {
    const stats = await EmergencyRequest.aggregate([
      { $match: { seekerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const ratings = await EmergencyRequest.find({
      seekerId: new mongoose.Types.ObjectId(userId),
      rating: { $ne: null },
    });

    const averageRating = ratings.length > 0
      ? ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length
      : 0;

    const result: any = { pending: 0, accepted: 0, completed: 0, cancelled: 0, averageRating: 0 };
    stats.forEach((s) => { if (s._id in result) result[s._id] = s.count; });
    result.averageRating = Math.round(averageRating * 100) / 100;
    return result;
  }
}

export default new EmergencyRequestService();