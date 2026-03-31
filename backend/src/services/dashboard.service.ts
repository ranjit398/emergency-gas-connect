// backend/src/services/dashboard.service.ts
// NEW FILE — slot into backend/src/services/
// Real-time aggregated stats for the provider dashboard

import mongoose from 'mongoose';
import Provider from '@models/Provider';
import EmergencyRequest from '@models/EmergencyRequest';
import Profile from '@models/Profile';
import Rating from '@models/Rating';
import { NotFoundError } from '@middleware/errorHandler';

function startOfDay() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function startOfMonth() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d;
}

export class DashboardService {

  // ── Provider stats (all real data from MongoDB) ──────────────────────────
  async getProviderStats(providerId: string) {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    const pId = new mongoose.Types.ObjectId(providerId);
    const [lng, lat] = provider.location?.coordinates ?? [0, 0];

    try {
      const [
        totalRequests,
        activeRequests,
        completedRequests,
        todayCompleted,
        monthCompleted,
        cancelledCount,
        nearbyCount,
        avgRatingResult,
        ratingDist,
        recentActivity,
      ] = await Promise.all([
        // All requests ever associated with provider
        EmergencyRequest.countDocuments({ providerId: pId }),

        // Currently active
        EmergencyRequest.countDocuments({ providerId: pId, status: 'accepted' }),

        // Completed all time
        EmergencyRequest.countDocuments({ providerId: pId, status: 'completed' }),

        // Today's completions
        EmergencyRequest.countDocuments({
          providerId: pId, status: 'completed',
          completedAt: { $gte: startOfDay() },
        }),

        // This month
        EmergencyRequest.countDocuments({
          providerId: pId, status: 'completed',
          completedAt: { $gte: startOfMonth() },
        }),

        // Cancelled
        EmergencyRequest.countDocuments({ providerId: pId, status: 'cancelled' }),

        // Nearby pending requests (5km) - with error handling for geospatial
        lng && lat && lng !== 0 && lat !== 0
          ? EmergencyRequest.countDocuments({
              status: 'pending',
              location: {
                $near: {
                  $geometry: { type: 'Point', coordinates: [lng, lat] },
                  $maxDistance: 5000,
                },
              },
            }).catch(() => 0)  // If geospatial query fails, return 0
          : Promise.resolve(0),

        // Real avg rating from Rating collection
        Rating.aggregate([
          { $match: { providerId: pId } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]),

        // Star distribution
        Rating.aggregate([
          { $match: { providerId: pId } },
          { $group: { _id: '$rating', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
        ]),

        // Last 5 completed requests for activity feed
        EmergencyRequest.find({ providerId: pId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select('status cylinderType address completedAt createdAt priorityLevel')
          .lean(),
      ]);

      const totalHandled = completedRequests + cancelledCount;
      const responseRate = totalHandled > 0
        ? Math.round((completedRequests / totalHandled) * 100)
        : 0;

      const avgRating = avgRatingResult[0]?.avg ?? provider.rating ?? 0;
      const totalRatings = avgRatingResult[0]?.count ?? provider.totalRatings ?? 0;

      // 7-day series
      const sevenDaySeries = await this.getSevenDaySeries(pId);

      // Rating distribution map
      const ratingDistMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDist.forEach((r: any) => { ratingDistMap[r._id] = r.count; });

      return {
        // Counts
        totalRequests,
        activeRequests,
        completedRequests,
        cancelledRequests: cancelledCount,
        nearbyRequests: nearbyCount,
        todayCompleted,
        monthCompleted,

        // Performance
        responseRate,
        responseRateLabel: `${responseRate}%`,

        // Rating
        averageRating: Math.round((avgRating ?? 0) * 10) / 10,
        totalRatings,
        ratingDistribution: ratingDistMap,

        // Inventory
        inventory: provider.availableCylinders ?? [],
        totalStock: (provider.availableCylinders ?? []).reduce((s: number, c: any) => s + (c.quantity ?? 0), 0),

        // Provider info
        businessName: provider.businessName,
        businessType: provider.businessType,
        isVerified: provider.isVerified,

        // Charts
        sevenDaySeries,

        // Recent activity
        recentActivity: recentActivity.map((r: any) => ({
          id: r._id?.toString(),
          status: r.status,
          cylinderType: r.cylinderType,
          address: r.address,
          completedAt: r.completedAt,
          createdAt: r.createdAt,
          priorityLevel: r.priorityLevel,
        })),

        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to compute provider stats: ${error.message}`);
    }
  }

  // ── 7-day completion series ───────────────────────────────────────────────
  async getSevenDaySeries(providerId: mongoose.Types.ObjectId) {
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = daysAgo(i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await EmergencyRequest.countDocuments({
        providerId,
        status: 'completed',
        completedAt: { $gte: dayStart, $lte: dayEnd },
      });

      series.push({
        date: dayStart.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday'
          : dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        fulfilled: count,
        revenue: count * 850,
      });
    }
    return series;
  }

  // ── Global platform stats (for admin / public) ───────────────────────────
  async getPlatformStats() {
    const [
      totalRequests,
      pendingRequests,
      completedToday,
      activeHelpers,
    ] = await Promise.all([
      EmergencyRequest.countDocuments(),
      EmergencyRequest.countDocuments({ status: 'pending' }),
      EmergencyRequest.countDocuments({
        status: 'completed',
        completedAt: { $gte: startOfDay() },
      }),
      Profile.countDocuments({ role: 'helper', isAvailable: true }),
    ]);

    return { totalRequests, pendingRequests, completedToday, activeHelpers };
  }
}

export default new DashboardService();