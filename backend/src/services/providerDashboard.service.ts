import Provider, { IProvider } from '@models/Provider';
import EmergencyRequest from '@models/EmergencyRequest';
import Profile, { IProfile } from '@models/Profile';
import User from '@models/User';
import { NotFoundError, ValidationError } from '@middleware/errorHandler';
import logger from '@utils/logger';

/**
 * Provider Dashboard Service
 * Handles business analytics, request tracking, helper monitoring, and inventory management
 */
export class ProviderDashboardService {
  /**
   * Get dashboard overview statistics
   * @param providerId - Provider's ObjectId
   * @returns Dashboard stats with requests, helpers, ratings, and inventory
   */
  async getDashboardStats(providerId: string) {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all statistics in parallel
    const [
      totalRequests,
      completedRequests,
      pendingRequests,
      activeRequests,
      todayCompleted,
      monthCompleted,
      helpers,
      rating,
    ] = await Promise.all([
      // Total requests assigned to this provider
      EmergencyRequest.countDocuments({ providerId }),
      // Completed requests
      EmergencyRequest.countDocuments({ providerId, status: 'completed' }),
      // Pending requests
      EmergencyRequest.countDocuments({ providerId, status: 'pending' }),
      // Active requests (accepted, in_progress)
      EmergencyRequest.countDocuments({
        providerId,
        status: { $in: ['accepted', 'in_progress'] },
      }),
      // Completed today
      EmergencyRequest.countDocuments({
        providerId,
        status: 'completed',
        completedAt: { $gte: todayStart },
      }),
      // Completed in last 30 days
      EmergencyRequest.countDocuments({
        providerId,
        status: 'completed',
        completedAt: { $gte: thirtyDaysAgo },
      }),
      // Get unique helpers and their status
      EmergencyRequest.aggregate([
        { $match: { providerId: provider._id } },
        { $group: { _id: '$helperId' } },
        { $count: 'total' },
      ]),
      // Provider's average rating
      EmergencyRequest.findOne({ providerId })
        .select('rating')
        .sort({ updatedAt: -1 }),
    ]);

    const activeHelpers = helpers[0]?.total || 0;
    const successRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      activeRequests,
      activeHelpers,
      todayCompleted,
      monthCompleted,
      successRate,
      averageRating: provider.rating || 0,
      totalRatings: provider.totalRatings || 0,
      businessName: provider.businessName,
      businessType: provider.businessType,
      isVerified: provider.isVerified,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all requests for a provider with detailed information
   * @param providerId - Provider's ObjectId
   * @param page - Pagination page (default 1)
   * @param limit - Items per page (default 20)
   * @param status - Filter by status (optional)
   */
  async getProviderRequests(
    providerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = { providerId };

    if (status) {
      query.status = status;
    }

    const [requests, total] = await Promise.all([
      EmergencyRequest.find(query)
        .populate('seekerId', 'email')
        .populate({
          path: 'helperId',
          select: 'email',
          populate: {
            path: 'profile',
            model: 'Profile',
            select: 'fullName phone rating',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmergencyRequest.countDocuments(query),
    ]);

    // Extract seeker and helper details from populated data
    const formattedRequests = requests.map((req) => ({
      requestId: req._id,
      cylinderType: req.cylinderType,
      status: req.status,
      quantity: req.quantity,
      address: req.address,
      seekerId: req.seekerId,
      seekerEmail: (req.seekerId as any)?.email || 'N/A',
      helperId: req.helperId,
      helperName: (req.helperId as any)?.profile?.fullName || 'Unassigned',
      helperRating: (req.helperId as any)?.profile?.rating || 0,
      createdAt: req.createdAt,
      acceptedAt: req.acceptedAt,
      completedAt: req.completedAt,
      priority: req.priorityLevel,
    }));

    return {
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get helper profiles working for a provider
   * @param providerId - Provider's ObjectId
   * @param page - Pagination page (default 1)
   * @param limit - Items per page (default 20)
   */
  async getProviderHelpers(providerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const providerObjectId = new (require('mongoose')).Types.ObjectId(providerId);

    // Get unique helpers who've worked with this provider
    const helperGroups = await EmergencyRequest.aggregate([
      { $match: { providerId: providerObjectId } },
      { $group: { _id: '$helperId', count: { $sum: 1 } } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const helperIds = helperGroups.map((h) => h._id);
    const totalHelpers = await EmergencyRequest.aggregate([
      { $match: { providerId: providerObjectId } },
      { $group: { _id: '$helperId' } },
      { $count: 'total' },
    ]);

    // Fetch helper profiles with their stats
    const helpers = await Promise.all(
      helperIds.map(async (helperId) => {
        const profile = await Profile.findOne({ userId: helperId }).lean();
        const stats = await EmergencyRequest.aggregate([
          { $match: { providerId: providerObjectId, helperId } },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
              },
              avgRating: { $avg: '$helperRating' },
            },
          },
        ]);

        return {
          helperId,
          fullName: profile?.fullName || 'Unknown',
          phone: profile?.phone || 'N/A',
          rating: profile?.ratings || 0,
          totalRequests: stats?.[0]?.totalRequests || 0,
          completedRequests: stats?.[0]?.completed || 0,
          isAvailable: profile?.isAvailable || false,
          currentActive: 0, // TODO: Track active requests
        };
      })
    );

    return {
      helpers,
      pagination: {
        page,
        limit,
        total: totalHelpers?.[0]?.total || 0,
        pages: Math.ceil((totalHelpers?.[0]?.total || 0) / limit),
        hasNextPage: page < Math.ceil((totalHelpers?.[0]?.total || 0) / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get inventory status for a provider
   * @param providerId - Provider's ObjectId
   */
  async getInventory(providerId: string) {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    return {
      lpgStock: provider.lpgStock || 0,
      cngStock: provider.cngStock || 0,
      totalStock: (provider.lpgStock || 0) + (provider.cngStock || 0),
      businessType: provider.businessType,
      lastUpdated: provider.updatedAt,
    };
  }

  /**
   * Update inventory for a provider
   * @param providerId - Provider's ObjectId
   * @param lpgStock - New LPG stock quantity
   * @param cngStock - New CNG stock quantity
   */
  async updateInventory(
    providerId: string,
    lpgStock?: number,
    cngStock?: number
  ): Promise<IProvider> {
    const updates: any = {};

    if (lpgStock !== undefined) {
      if (lpgStock < 0) throw new ValidationError('Stock quantity cannot be negative');
      updates.lpgStock = lpgStock;
    }

    if (cngStock !== undefined) {
      if (cngStock < 0) throw new ValidationError('Stock quantity cannot be negative');
      updates.cngStock = cngStock;
    }

    const provider = await Provider.findByIdAndUpdate(providerId, updates, {
      new: true,
      runValidators: true,
    });

    if (!provider) throw new NotFoundError('Provider not found');

    logger.info(`Inventory updated for provider ${providerId}`, updates);
    return provider;
  }

  /**
   * Reduce stock when a request is completed
   * @param providerId - Provider's ObjectId
   * @param cylinderType - Type of cylinder ('LPG' | 'CNG')
   * @param quantity - Quantity to reduce
   */
  async reduceInventory(
    providerId: string,
    cylinderType: 'LPG' | 'CNG',
    quantity: number
  ): Promise<IProvider> {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    if (cylinderType === 'LPG') {
      if ((provider.lpgStock || 0) < quantity) {
        throw new ValidationError(
          `Insufficient LPG stock. Available: ${provider.lpgStock}, Required: ${quantity}`
        );
      }
      provider.lpgStock = (provider.lpgStock || 0) - quantity;
    } else if (cylinderType === 'CNG') {
      if ((provider.cngStock || 0) < quantity) {
        throw new ValidationError(
          `Insufficient CNG stock. Available: ${provider.cngStock}, Required: ${quantity}`
        );
      }
      provider.cngStock = (provider.cngStock || 0) - quantity;
    }

    await provider.save();
    logger.info(`Inventory reduced for provider ${providerId}: ${cylinderType} -${quantity}`);
    return provider;
  }

  /**
   * Get provider performance analytics
   * @param providerId - Provider's ObjectId
   */
  async getAnalytics(providerId: string) {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await EmergencyRequest.aggregate([
      {
        $match: {
          providerId: provider._id,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]);

    // Format analytics data by date
    const formattedAnalytics: any = {};
    analytics.forEach((item: any) => {
      if (!formattedAnalytics[item._id.date]) {
        formattedAnalytics[item._id.date] = {
          date: item._id.date,
          fulfilled: 0,
          pending: 0,
          cancelled: 0,
        };
      }
      formattedAnalytics[item._id.date][item._id.status] = item.count;
    });

    return Object.values(formattedAnalytics);
  }
}

export default new ProviderDashboardService();
