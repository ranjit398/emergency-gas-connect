import Rating, { IRating } from '@models/Rating';
import Profile from '@models/Profile';
import Provider from '@models/Provider';
import { NotFoundError, ValidationError } from '@middleware/errorHandler';

export class RatingService {
  async createRating(
    requestId: string,
    fromUserId: string,
    toUserId: string,
    providerId: string | null,
    rating: number,
    review: string
  ): Promise<IRating> {
    // Check if rating already exists
    const existing = await Rating.findOne({
      requestId,
      fromUserId,
    });

    if (existing) {
      throw new ValidationError('Rating already exists for this request');
    }

    const ratingDoc = await Rating.create({
      requestId,
      fromUserId,
      toUserId,
      providerId,
      rating,
      review,
    });

    // Update profile ratings
    await Profile.findOneAndUpdate(
      { userId: toUserId },
      [
        {
          $set: {
            ratings: {
              $divide: [
                {
                  $add: [
                    '$ratings',
                    rating,
                  ],
                },
                {
                  $add: ['$totalRatings', 1],
                },
              ],
            },
            totalRatings: { $add: ['$totalRatings', 1] },
          },
        },
      ]
    );

    // Update provider ratings if applicable
    if (providerId) {
      await Provider.findByIdAndUpdate(
        providerId,
        [
          {
            $set: {
              rating: {
                $divide: [
                  {
                    $add: [
                      '$rating',
                      rating,
                    ],
                  },
                  {
                    $add: ['$totalRatings', 1],
                  },
                ],
              },
              totalRatings: { $add: ['$totalRatings', 1] },
            },
          },
        ]
      );
    }

    return ratingDoc;
  }

  async getRatings(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ ratings: IRating[]; total: number }> {
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find({ toUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUserId', 'fullName avatarUrl')
        .populate('requestId', 'cylinderType status'),
      Rating.countDocuments({ toUserId: userId }),
    ]);

    return { ratings, total };
  }

  async getProviderRatings(
    providerId: string,
    page = 1,
    limit = 20
  ): Promise<{ ratings: IRating[]; total: number }> {
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      Rating.find({ providerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUserId', 'fullName avatarUrl')
        .populate('requestId', 'cylinderType'),
      Rating.countDocuments({ providerId }),
    ]);

    return { ratings, total };
  }

  async getAverageRating(userId: string): Promise<number> {
    const result = await Rating.aggregate([
      { $match: { toUserId: userId as any } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    return result.length > 0 ? Math.round(result[0].avgRating * 100) / 100 : 0;
  }

  async getProviderAverageRating(providerId: string): Promise<number> {
    const result = await Rating.aggregate([
      { $match: { providerId: providerId as any } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    return result.length > 0 ? Math.round(result[0].avgRating * 100) / 100 : 0;
  }
}

export default new RatingService();
