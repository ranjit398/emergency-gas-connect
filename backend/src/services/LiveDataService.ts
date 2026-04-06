// backend/src/services/LiveDataService.ts
// NEW — Single service powering all live data across roles
// Returns real MongoDB data for Provider, Helper, and Seeker views

import mongoose from 'mongoose';
import EmergencyRequest from '@models/EmergencyRequest';
import Profile from '@models/Profile';
import Provider from '@models/Provider';
import Message from '@models/Message';
import Rating from '@models/Rating';
import User from '@models/User';
import { NotFoundError } from '@middleware/errorHandler';

// ── Helper functions ──────────────────────────────────────────────────────────
function startOfDay() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function startOfMonth() { return new Date(new Date().getFullYear(), new Date().getMonth(), 1); }
function startOfWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d; }

// Get comprehensive stats for any user/role
async function getComprehensiveStats(userId: string, role: 'provider' | 'helper' | 'seeker') {
  if (role === 'provider') {
    const provider = await Provider.findOne({ userId });
    if (!provider) return null;
    const pId = provider._id;
    
    const totalRequests = await EmergencyRequest.countDocuments({ providerId: pId });
    const completedRequests = await EmergencyRequest.countDocuments({ providerId: pId, status: 'completed' });
    const pendingRequests = await EmergencyRequest.countDocuments({ providerId: pId, status: 'pending' });
    const activeRequests = await EmergencyRequest.countDocuments({ providerId: pId, status: 'accepted' });
    const cancelledRequests = await EmergencyRequest.countDocuments({ providerId: pId, status: 'cancelled' });
    const todayCompleted = await EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: startOfDay() } });
    const weekCompleted = await EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: startOfWeek() } });
    const monthCompleted = await EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: startOfMonth() } });
    
    return {
      totalRequests, completedRequests, pendingRequests, activeRequests, cancelledRequests,
      todayCompleted, weekCompleted, monthCompleted
    };
  } else if (role === 'helper') {
    const uId = new mongoose.Types.ObjectId(userId);
    const totalAccepted = await EmergencyRequest.countDocuments({ helperId: uId });
    const totalCompleted = await EmergencyRequest.countDocuments({ helperId: uId, status: 'completed' });
    const activeNow = await EmergencyRequest.countDocuments({ helperId: uId, status: 'accepted' });
    
    return { totalAccepted, totalCompleted, activeNow };
  } else {
    const uId = new mongoose.Types.ObjectId(userId);
    const pending = await EmergencyRequest.countDocuments({ seekerId: uId, status: 'pending' });
    const accepted = await EmergencyRequest.countDocuments({ seekerId: uId, status: 'accepted' });
    const completed = await EmergencyRequest.countDocuments({ seekerId: uId, status: 'completed' });
    const cancelled = await EmergencyRequest.countDocuments({ seekerId: uId, status: 'cancelled' });
    
    return { pending, accepted, completed, cancelled };
  }
}

// Safe geospatial query wrapper — falls back to non-geo if geo fails
async function tryGeoNearAggregation(
  pipeline: any[],
  fallbackPipeline: any[] | null = null
): Promise<any[]> {
  try {
    return await EmergencyRequest.aggregate(pipeline);
  } catch (err: any) {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('near') || msg.includes('geospatial') || msg.includes('sphere')) {
      // Geo index missing or malformed data - use fallback
      if (fallbackPipeline) {
        return await EmergencyRequest.aggregate(fallbackPipeline);
      }
      return []; // Return empty if no fallback
    }
    throw err; // Re-throw unexpected errors
  }
}

// Safe geospatial count wrapper
async function tryGeoNearCount(
  filter: any,
  fallbackFilter: any | null = null
): Promise<number> {
  try {
    return await EmergencyRequest.countDocuments(filter);
  } catch (err: any) {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('near') || msg.includes('geospatial') || msg.includes('sphere')) {
      if (fallbackFilter) {
        return await EmergencyRequest.countDocuments(fallbackFilter);
      }
      return 0;
    }
    throw err;
  }
}

// ── PROVIDER live data ────────────────────────────────────────────────────────
export async function getProviderLiveData(userId: string) {
  const provider = await Provider.findOne({ userId });
  if (!provider) throw new NotFoundError('Provider profile not found');

  const pId = provider._id as mongoose.Types.ObjectId;
  const [lng, lat] = provider.location.coordinates;

  // Geospatial query with fallback to non-geo sorting
  const geoPipeline = [
    { $geoNear: { near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'dist', maxDistance: 8000, spherical: true, query: { status: 'pending' } } },
    { $sort: { priorityScore: -1 } },
    { $limit: 8 },
    { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
    { $lookup: { from: 'users', localField: 'seekerId', foreignField: '_id', as: '_su' } },
    { $addFields: {
      id: { $toString: '$_id' },
      distanceKm: { $round: [{ $divide: ['$dist', 1000] }, 2] },
      seekerName: { $ifNull: [{ $arrayElemAt: ['$_sp.fullName', 0] }, 'Anonymous'] },
      minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
      canFulfill: {
        $gt: [{
          $size: {
            $filter: {
              input: provider.availableCylinders,
              as: 'c',
              cond: { $and: [{ $eq: ['$$c.type', '$cylinderType'] }, { $gte: ['$$c.quantity', '$quantity'] }] }
            }
          }
        }, 0]
      }
    }},
    { $project: { _sp: 0, _su: 0 } },
  ];

  // Fallback: no geo, just priority sort
  const fallbackPipeline = [
    { $match: { status: 'pending' } },
    { $sort: { priorityScore: -1 } },
    { $limit: 8 },
    { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
    { $lookup: { from: 'users', localField: 'seekerId', foreignField: '_id', as: '_su' } },
    { $addFields: {
      id: { $toString: '$_id' },
      distanceKm: 0,
      seekerName: { $ifNull: [{ $arrayElemAt: ['$_sp.fullName', 0] }, 'Anonymous'] },
      minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
      canFulfill: {
        $gt: [{
          $size: {
            $filter: {
              input: provider.availableCylinders,
              as: 'c',
              cond: { $and: [{ $eq: ['$$c.type', '$cylinderType'] }, { $gte: ['$$c.quantity', '$quantity'] }] }
            }
          }
        }, 0]
      }
    }},
    { $project: { _sp: 0, _su: 0 } },
  ];

  const [
    totalRequests, activeRequests, completedRequests, cancelledCount,
    todayCompleted, monthCompleted,
    nearbyPending, nearbyList,
    avgRatingResult, ratingDist, recentRatings,
    recentActivity, sevenDaySeries,
    unreadMessages,
  ] = await Promise.all([
    EmergencyRequest.countDocuments({ providerId: pId }),
    EmergencyRequest.countDocuments({ providerId: pId, status: 'accepted' }),
    EmergencyRequest.countDocuments({ providerId: pId, status: 'completed' }),
    EmergencyRequest.countDocuments({ providerId: pId, status: 'cancelled' }),
    EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: startOfDay() } }),
    EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: startOfMonth() } }),
    // Nearby pending count — try geo, fallback to just count pending
    tryGeoNearCount(
      { status: 'pending', location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 5000 } } },
      { status: 'pending' }
    ),
    // Nearby pending list — try geo, fallback to priority sort
    tryGeoNearAggregation(geoPipeline, fallbackPipeline),
    // Rating aggregation from Rating model
    Rating.aggregate([
      { $match: { providerId: pId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Rating.aggregate([
      { $match: { providerId: pId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    // Recent 5 ratings with reviewer names
    Rating.aggregate([
      { $match: { providerId: pId } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'profiles', localField: 'fromUserId', foreignField: 'userId', as: '_p' } },
      { $addFields: { reviewerName: { $ifNull: [{ $arrayElemAt: ['$_p.fullName', 0] }, 'Anonymous'] } } },
      { $project: { _p: 0 } },
    ]),
    // Recent 10 requests
    EmergencyRequest.find({ providerId: pId }).sort({ updatedAt: -1 }).limit(10)
      .select('status cylinderType address completedAt createdAt priorityLevel quantity').lean(),
    // 7-day series
    (async () => {
      const series = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = daysAgo(i);
        const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999);
        const count = await EmergencyRequest.countDocuments({ providerId: pId, status: 'completed', completedAt: { $gte: dayStart, $lte: dayEnd } });
        series.push({
          date: dayStart.toISOString().split('T')[0],
          label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
          fulfilled: count, revenue: count * 850,
        });
      }
      return series;
    })(),
    // Unread messages
    Message.countDocuments({ receiverId: new mongoose.Types.ObjectId(userId), isRead: false }),
  ]);

  const totalHandled = completedRequests + cancelledCount;
  const responseRate = totalHandled > 0 ? Math.round((completedRequests / totalHandled) * 100) : 0;
  const avgRating = avgRatingResult[0]?.avg ?? provider.rating ?? 0;
  const ratingDistMap: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0 };
  ratingDist.forEach((r: any) => { ratingDistMap[r._id] = r.count; });

  const totalStock = provider.availableCylinders.reduce((s: number, c: any) => s + (c.quantity??0), 0);

  return {
    role: 'provider' as const,
    provider: {
      id: provider._id.toString(),
      businessName: provider.businessName,
      businessType: provider.businessType,
      isVerified: provider.isVerified,
      contactNumber: provider.contactNumber,
      address: provider.address,
      operatingHours: provider.operatingHours,
      inventory: provider.availableCylinders,
      totalStock,
      stockStatus: totalStock === 0 ? 'empty' : totalStock < 5 ? 'low' : totalStock < 20 ? 'medium' : 'healthy',
    },
    stats: {
      totalRequests, activeRequests, completedRequests,
      cancelledRequests: cancelledCount,
      nearbyPending, todayCompleted, monthCompleted,
      responseRate, responseRateLabel: `${responseRate}%`,
    },
    ratings: {
      average: Math.round((avgRating??0)*10)/10,
      total: avgRatingResult[0]?.count ?? provider.totalRatings ?? 0,
      distribution: ratingDistMap,
      recent: recentRatings.map((r: any) => ({
        score: r.rating, review: r.review,
        reviewer: r.reviewerName,
        date: r.createdAt,
      })),
    },
    nearbyRequests: nearbyList,
    recentActivity: recentActivity.map((r: any) => ({
      id: r._id?.toString(), status: r.status,
      cylinderType: r.cylinderType, quantity: r.quantity,
      address: r.address, completedAt: r.completedAt,
      createdAt: r.createdAt, priorityLevel: r.priorityLevel,
    })),
    sevenDaySeries,
    unreadMessages,
    fetchedAt: new Date().toISOString(),
  };
}

// ── HELPER live data ──────────────────────────────────────────────────────────
export async function getHelperLiveData(userId: string) {
  const profile = await Profile.findOne({ userId });
  if (!profile) throw new NotFoundError('Helper profile not found');

  const uId = new mongoose.Types.ObjectId(userId);
  const coords = profile.location?.coordinates;

  // Geospatial pipeline with fallback
  const geoPipeline = coords ? [
    { $geoNear: { near: { type: 'Point', coordinates: [coords[0], coords[1]] }, distanceField: 'dist', maxDistance: 15000, spherical: true, query: { status: 'pending' } } },
    { $sort: { priorityScore: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
    { $addFields: {
      id: { $toString: '$_id' },
      distanceKm: { $round: [{ $divide: ['$dist', 1000] }, 2] },
      seekerName: { $ifNull: [{ $arrayElemAt: ['$_sp.fullName', 0] }, 'Anonymous'] },
      minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
    }},
    { $project: { _sp: 0 } },
  ] : null;

  // Fallback: no geo, just priority sort
  const fallbackPipeline = [
    { $match: { status: 'pending' } },
    { $sort: { priorityScore: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
    { $addFields: {
      id: { $toString: '$_id' },
      distanceKm: 0,
      seekerName: { $ifNull: [{ $arrayElemAt: ['$_sp.fullName', 0] }, 'Anonymous'] },
      minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
    }},
    { $project: { _sp: 0 } },
  ];

  const [
    totalAccepted, totalCompleted, activeNow,
    pendingNearby, myRequests, unreadMessages,
    avgRatingResult, earningsThisMonth,
  ] = await Promise.all([
    EmergencyRequest.countDocuments({ helperId: uId }),
    EmergencyRequest.countDocuments({ helperId: uId, status: 'completed' }),
    EmergencyRequest.countDocuments({ helperId: uId, status: 'accepted' }),
    // Nearby pending requests helper can accept (with geo fallback)
    geoPipeline ? tryGeoNearAggregation(geoPipeline, fallbackPipeline) : Promise.resolve([]),
    // My assigned requests (active + recent completed)
    EmergencyRequest.aggregate([
      { $match: { helperId: uId, status: { $in: ['accepted', 'completed', 'pending'] } } },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
      { $lookup: { from: 'users', localField: 'seekerId', foreignField: '_id', as: '_su' } },
      { $addFields: {
        id: { $toString: '$_id' },
        seekerName: { $ifNull: [{ $arrayElemAt: ['$_sp.fullName', 0] }, 'Anonymous'] },
        seekerPhone: { $arrayElemAt: ['$_sp.phone', 0] },
        minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
      }},
      { $project: { _sp: 0, _su: 0 } },
    ]),
    Message.countDocuments({ receiverId: uId, isRead: false }),
    Rating.aggregate([
      { $match: { toUserId: uId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    EmergencyRequest.countDocuments({ helperId: uId, status: 'completed', completedAt: { $gte: startOfMonth() } }),
  ]);

  const totalHandled = totalAccepted;
  const completionRate = totalHandled > 0 ? Math.round((totalCompleted / totalHandled) * 100) : 0;

  return {
    role: 'helper' as const,
    helper: {
      id: userId,
      fullName: profile.fullName,
      isAvailable: profile.isAvailable,
      rating: Math.round((avgRatingResult[0]?.avg ?? profile.ratings ?? 0) * 10) / 10,
      totalRatings: avgRatingResult[0]?.count ?? profile.totalRatings ?? 0,
      completedRequests: profile.completedRequests,
      avgResponseTimeMin: profile.avgResponseTimeMin ?? 15,
      verificationStatus: profile.verificationStatus,
    },
    stats: {
      totalAccepted, totalCompleted, activeNow,
      earningsThisMonth, completionRate,
      completionRateLabel: `${completionRate}%`,
    },
    pendingNearby,
    myRequests,
    unreadMessages,
    fetchedAt: new Date().toISOString(),
  };
}

// ── SEEKER live data ──────────────────────────────────────────────────────────
export async function getSeekerLiveData(userId: string) {
  const uId = new mongoose.Types.ObjectId(userId);
  const profile = await Profile.findOne({ userId });

  const [myRequests, unreadMessages, recentHelpers] = await Promise.all([
    // All requests with populated seeker/helper
    EmergencyRequest.aggregate([
      { $match: { seekerId: uId } },
      { $sort: { createdAt: -1 } },
      { $limit: 30 },
      { $lookup: { from: 'profiles', localField: 'helperId', foreignField: 'userId', as: '_hp' } },
      { $addFields: {
        id: { $toString: '$_id' },
        helperName: { $ifNull: [{ $arrayElemAt: ['$_hp.fullName', 0] }, null] },
        helperPhone: { $arrayElemAt: ['$_hp.phone', 0] },
        helperRating: { $arrayElemAt: ['$_hp.ratings', 0] },
        helperAvatar: { $arrayElemAt: ['$_hp.avatarUrl', 0] },
        minutesAgo: { $floor: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] } },
      }},
      { $project: { _hp: 0 } },
    ]),
    Message.countDocuments({ receiverId: uId, isRead: false }),
    // Helpers who helped this seeker before (for quick re-request)
    EmergencyRequest.aggregate([
      { $match: { seekerId: uId, status: 'completed', helperId: { $ne: null } } },
      { $group: { _id: '$helperId', count: { $sum: 1 }, lastAt: { $max: '$completedAt' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'profiles', localField: '_id', foreignField: 'userId', as: '_p' } },
      { $addFields: {
        helperId: { $toString: '$_id' },
        fullName: { $arrayElemAt: ['$_p.fullName', 0] },
        rating: { $arrayElemAt: ['$_p.ratings', 0] },
        avatarUrl: { $arrayElemAt: ['$_p.avatarUrl', 0] },
        timesHelped: '$count',
      }},
      { $project: { _p: 0, _id: 0 } },
    ]),
  ]);

  const stats = {
    pending:   myRequests.filter((r: any) => r.status === 'pending').length,
    accepted:  myRequests.filter((r: any) => r.status === 'accepted').length,
    completed: myRequests.filter((r: any) => r.status === 'completed').length,
    cancelled: myRequests.filter((r: any) => r.status === 'cancelled').length,
    total:     myRequests.length,
  };

  return {
    role: 'seeker' as const,
    seeker: {
      id: userId,
      fullName: profile?.fullName ?? 'User',
      avatarUrl: profile?.avatarUrl ?? null,
    },
    stats,
    myRequests,
    recentHelpers,
    unreadMessages,
    fetchedAt: new Date().toISOString(),
  };
}

// ── UNIFIED endpoint — returns role-appropriate data ──────────────────────────
export async function getLiveData(userId: string, role: string) {
  switch (role) {
    case 'provider': return getProviderLiveData(userId);
    case 'helper':   return getHelperLiveData(userId);
    case 'seeker':   return getSeekerLiveData(userId);
    default:         return getSeekerLiveData(userId);
  }
}
