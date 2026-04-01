import { Request, Response, NextFunction } from 'express';
import { EmergencyRequest } from '../models/EmergencyRequest';
import asyncHandler from 'express-async-handler';

/**
 * Optimized Analytics Service
 * Uses efficient aggregation pipelines with proper indexing
 */

export class OptimizedAnalyticsService {
  /**
   * Get dashboard statistics with denormalized data
   * Uses $lookup only when necessary and applies early filtering
   */
  static async getDashboardStatsOptimized(providerId: string) {
    try {
      const stats = await EmergencyRequest.aggregate([
        {
          $match: { providerId: providerId },
        },
        {
          $facet: {
            totalRequests: [
              {
                $count: 'count',
              },
            ],
            completedRequests: [
              {
                $match: { status: 'completed' },
              },
              {
                $count: 'count',
              },
            ],
            pendingRequests: [
              {
                $match: { status: 'pending' },
              },
              {
                $count: 'count',
              },
            ],
            activeRequests: [
              {
                $match: { status: 'active' },
              },
              {
                $count: 'count',
              },
            ],
            avgCompletionTime: [
              {
                $match: { status: 'completed' },
              },
              {
                $group: {
                  _id: null,
                  avgTime: {
                    $avg: {
                      $subtract: ['$completedAt', '$createdAt'],
                    },
                  },
                },
              },
            ],
            successRate: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: 1,
                  },
                  completed: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  rate: {
                    $multiply: [{ $divide: ['$completed', '$total'] }, 100],
                  },
                },
              },
            ],
          },
        },
      ]);

      return {
        total: stats[0].totalRequests[0]?.count || 0,
        completed: stats[0].completedRequests[0]?.count || 0,
        pending: stats[0].pendingRequests[0]?.count || 0,
        active: stats[0].activeRequests[0]?.count || 0,
        avgCompletionTime: stats[0].avgCompletionTime[0]?.avgTime || 0,
        successRate: stats[0].successRate[0]?.rate || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get analytics data with optimized aggregation
   * Groups by date for charts, uses compound indexes
   */
  static async getAnalyticsOptimized(providerId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await EmergencyRequest.aggregate([
        {
          $match: {
            providerId: providerId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              status: '$status',
            },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        {
          $sort: { '_id.date': 1 },
        },
      ]);

      // Transform for frontend
      const byDate: Record<string, any> = {};
      analytics.forEach((item) => {
        const date = item._id.date;
        if (!byDate[date]) {
          byDate[date] = {
            date,
            pending: 0,
            active: 0,
            completed: 0,
            cancelled: 0,
            totalRevenue: 0,
          };
        }
        byDate[date][item._id.status] = item.count;
        byDate[date].totalRevenue += item.revenue || 0;
      });

      return Object.values(byDate);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get requests with pagination
   * Uses indexed fields: providerId + status + createdAt
   */
  static async getRequestsOptimized(
    providerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    try {
      const skip = (page - 1) * limit;

      const query: any = { providerId: providerId };
      if (status) {
        query.status = status;
      }

      const requests = await EmergencyRequest.find(query)
        .select('_id cylinderType seekerId helperAssigned status priority createdAt amount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean for faster queries

      const total = await EmergencyRequest.countDocuments(query);

      return {
        requests,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch fetch denormalized helper stats
   * Reduces N+1 queries
   */
  static async getHelpersStatsOptimized(providerId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const helpers = await EmergencyRequest.aggregate([
        {
          $match: { providerId: providerId, helperAssigned: { $exists: true, $ne: null } },
        },
        {
          $group: {
            _id: '$helperAssigned',
            totalCompleted: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            totalRequests: { $sum: 1 },
            avgRating: { $avg: '$helperRating' },
            lastActive: { $max: '$updatedAt' },
          },
        },
        {
          $addFields: {
            successRate: {
              $multiply: [{ $divide: ['$totalCompleted', '$totalRequests'] }, 100],
            },
          },
        },
        {
          $sort: { totalCompleted: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const total = await EmergencyRequest.distinct('helperAssigned', {
        providerId: providerId,
      });

      return {
        helpers,
        pagination: {
          total: total.length,
          page,
          limit,
          pages: Math.ceil(total.length / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Optimized Controller Handler
 */
export const getDashboardStatsOptimized = asyncHandler(async (req: Request, res: Response) => {
  const providerId = (req as any).user.id;

  const stats = await OptimizedAnalyticsService.getDashboardStatsOptimized(providerId);

  res.status(200).json({
    success: true,
    message: 'Dashboard statistics retrieved',
    data: stats,
  });
});

export const getAnalyticsOptimized = asyncHandler(async (req: Request, res: Response) => {
  const providerId = (req as any).user.id;
  const days = parseInt(req.query.days as string) || 30;

  const analytics = await OptimizedAnalyticsService.getAnalyticsOptimized(providerId, days);

  res.status(200).json({
    success: true,
    message: 'Analytics data retrieved',
    data: analytics,
  });
});

export const getRequestsOptimized = asyncHandler(async (req: Request, res: Response) => {
  const providerId = (req as any).user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;

  const result = await OptimizedAnalyticsService.getRequestsOptimized(
    providerId,
    page,
    limit,
    status
  );

  res.status(200).json({
    success: true,
    message: 'Requests retrieved',
    data: result.requests,
    pagination: result.pagination,
  });
});

export const getHelpersOptimized = asyncHandler(async (req: Request, res: Response) => {
  const providerId = (req as any).user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await OptimizedAnalyticsService.getHelpersStatsOptimized(providerId, page, limit);

  res.status(200).json({
    success: true,
    message: 'Helper stats retrieved',
    data: result.helpers,
    pagination: result.pagination,
  });
});
