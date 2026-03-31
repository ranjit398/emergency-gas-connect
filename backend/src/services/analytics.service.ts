// backend/src/services/analytics.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Analytics Service
// Computes provider and platform-wide statistics
// ─────────────────────────────────────────────────────────────────────────────

import EmergencyRequest from '@models/EmergencyRequest';
import Profile from '@models/Profile';
import Rating from '@models/Rating';
import logger from '@utils/logger';

/**
 * Get comprehensive provider analytics
 */
export const getProviderAnalytics = async (providerId: string) => {
  try {
    // Fetch all requests associated with this provider
    const requests = await EmergencyRequest.find({
      providerId,
      status: { $in: ['completed', 'cancelled', 'expired'] },
    });

    const activeRequests = await EmergencyRequest.find({
      providerId,
      status: { $in: ['pending', 'accepted', 'in_progress'] },
    });

    // Calculate metrics
    const totalRequests = requests.length;
    const completedRequests = requests.filter(
      (r) => r.status === 'completed'
    ).length;
    const cancelledRequests = requests.filter(
      (r) => r.status === 'cancelled'
    ).length;
    const expiredRequests = requests.filter(
      (r) => r.status === 'expired'
    ).length;

    const successRate = totalRequests > 0 
      ? ((completedRequests / totalRequests) * 100).toFixed(2)
      : 0;

    // Response time analytics
    const responseTimes = requests
      .filter((r) => r.helperResponseTime)
      .map((r) => r.helperResponseTime!);

    const avgResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          )
        : 0;

    // Get ratings
    const ratings = await Rating.find({ providerId }).lean();
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
        : 0;

    // Peak hours (most requests handled)
    const hourStats: Record<number, number> = {};
    requests.forEach((req) => {
      const hour = new Date(req.completedAt || req.createdAt).getHours();
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    });

    const peakHour =
      Object.entries(hourStats).sort(([, a], [, b]) => b - a)[0]?.[0] || 0;

    return {
      summary: {
        totalRequests,
        completedRequests,
        activeRequests: activeRequests.length,
        cancelledRequests,
        expiredRequests,
        successRate: parseFloat(successRate as string),
      },
      performance: {
        avgResponseTime,
        avgRating: parseFloat(avgRating as string),
        totalRatings: ratings.length,
        peakHour: parseInt(peakHour as string),
      },
      trends: {
        last7Days: await getRequestTrend(providerId, 7),
        last30Days: await getRequestTrend(providerId, 30),
      },
    };
  } catch (error) {
    logger.error('Error computing provider analytics:', error);
    throw error;
  }
};

/**
 * Get request trend for specified days
 */
const getRequestTrend = async (providerId: string, days: number) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const requests = await EmergencyRequest.find({
    providerId,
    createdAt: { $gte: startDate },
  });

  const trend: Record<string, number> = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trend[dateStr] = 0;
  }

  requests.forEach((req) => {
    const dateStr = req.createdAt.toISOString().split('T')[0];
    trend[dateStr] = (trend[dateStr] || 0) + 1;
  });

  return trend;
};

/**
 * Get platform-wide analytics
 */
export const getPlatformAnalytics = async () => {
  try {
    const totalRequests = await EmergencyRequest.countDocuments({});
    const completedRequests = await EmergencyRequest.countDocuments({
      status: 'completed',
    });
    const pendingRequests = await EmergencyRequest.countDocuments({
      status: 'pending',
    });
    const activeRequests = await EmergencyRequest.countDocuments({
      status: { $in: ['accepted', 'in_progress'] },
    });

    const totalHelpers = await Profile.countDocuments({ role: 'helper' });
    const availableHelpers = await Profile.countDocuments({
      role: 'helper',
      isAvailable: true,
    });

    const totalProviders = await Profile.countDocuments({ role: 'provider' });

    const successRate =
      totalRequests > 0
        ? ((completedRequests / totalRequests) * 100).toFixed(2)
        : 0;

    // Get average ratings
    const ratings = await Rating.find({}).lean();
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
        : 0;

    // Busy hours analysis
    const hourDistribution: Record<number, number> = {};
    const requests = await EmergencyRequest.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();

    requests.forEach((req) => {
      const hour = new Date(req.createdAt).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });

    return {
      requests: {
        total: totalRequests,
        completed: completedRequests,
        pending: pendingRequests,
        active: activeRequests,
        successRate: parseFloat(successRate as string),
      },
      helpers: {
        total: totalHelpers,
        available: availableHelpers,
        unavailable: totalHelpers - availableHelpers,
      },
      providers: totalProviders,
      ratings: {
        average: parseFloat(avgRating as string),
        total: ratings.length,
      },
      busyHours: Object.entries(hourDistribution)
        .map(([hour, count]) => ({ hour: parseInt(hour), requests: count }))
        .sort((a, b) => b.requests - a.requests),
    };
  } catch (error) {
    logger.error('Error computing platform analytics:', error);
    throw error;
  }
};

/**
 * Get helper performance metrics
 */
export const getHelperMetrics = async (helperId: string) => {
  try {
    const requests = await EmergencyRequest.find({
      helperId,
      status: 'completed',
    });

    const totalRequests = requests.length;
    const avgResponseTime = requests.length > 0
      ? Math.round(
          requests
            .filter((r) => r.helperResponseTime)
            .reduce((sum, r) => sum + (r.helperResponseTime || 0), 0) /
            requests.length
        )
      : 0;

    const ratings = await Rating.find({
      giverId: helperId,
    }).lean();

    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
      : 0;

    // Response rate (accepted / offered requests)
    const offeredCount = await EmergencyRequest.countDocuments({
      helperId,
      status: { $in: ['completed', 'cancelled'] },
    });

    const responseRate = offeredCount > 0
      ? ((totalRequests / offeredCount) * 100).toFixed(2)
      : 0;

    return {
      totalRequests,
      completedRequests: totalRequests,
      avgResponseTime,
      avgRating: parseFloat(avgRating as string),
      totalRatings: ratings.length,
      responseRate: parseFloat(responseRate as string),
      acceptanceRate:
        offeredCount > 0
          ? ((totalRequests / offeredCount) * 100).toFixed(2)
          : 0,
    };
  } catch (error) {
    logger.error('Error computing helper metrics:', error);
    throw error;
  }
};

export default {
  getProviderAnalytics,
  getPlatformAnalytics,
  getHelperMetrics,
};
