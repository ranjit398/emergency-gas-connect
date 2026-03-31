// backend/src/services/smartTagging.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Smart Tagging Service
// Adds intelligent labels to requests and helpers
// ─────────────────────────────────────────────────────────────────────────────

import EmergencyRequest from './models/EmergencyRequest';
import Profile from './models/Profile';
import Rating from './models/Rating';
import { IEmergencyRequest } from './models/EmergencyRequest';

export interface TaggedRequest extends Record<string, any> {
  _doc?: any;
  tags?: string[];
}

/**
 * Add smart tags to a request based on available helpers
 */
export const tagRequest = async (request: IEmergencyRequest) => {
  const tags: string[] = [];

  // Tag based on priority
  if (request.priorityLevel === 'critical') {
    tags.push('🚨 CRITICAL');
  } else if (request.priorityLevel === 'high') {
    tags.push('⚡ HIGH PRIORITY');
  }

  // Tag based on urgency (created recently)
  const createdMinutesAgo =
    (Date.now() - request.createdAt.getTime()) / (1000 * 60);
  if (createdMinutesAgo < 1) {
    tags.push('🔥 JUST NOW');
  } else if (createdMinutesAgo < 5) {
    tags.push('⏱️ URGENT');
  }

  // Tag based on reassignments
  if (request.reassignmentCount && request.reassignmentCount > 0) {
    tags.push(`🔄 REASSIGNMENT #${request.reassignmentCount}`);
  }

  return tags;
};

/**
 * Tag helpers in request recommendations
 */
export const tagHelpers = async (
  request: IEmergencyRequest,
  helpers: any[]
) => {
  const taggedHelpers = await Promise.all(
    helpers.map(async (helper) => {
      const tags: string[] = [];

      // Get helper metrics
      const ratings = await Rating.find({ giverId: helper._id }).lean();
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      const helperRequests = await EmergencyRequest.find({
        helperId: helper._id,
        status: 'completed',
      }).lean();

      const avgResponseTime =
        helperRequests.length > 0
          ? helperRequests
              .filter((r: any) => r.helperResponseTime)
              .reduce((sum: number, r: any) => sum + (r.helperResponseTime || 0), 0) /
              helperRequests.length
          : 0;

      // Calculate distance
      const distance = helper.distanceKm || 0;

      // Tag based on distance
      if (distance < 2) {
        tags.push('📍 NEAREST');
      } else if (distance < 5) {
        tags.push('📍 NEARBY');
      }

      // Tag based on rating
      if (avgRating >= 4.8) {
        tags.push('⭐ EXCELLENT');
      } else if (avgRating >= 4.5) {
        tags.push('⭐ TRUSTED');
      } else if (avgRating >= 4.0) {
        tags.push('⭐ GOOD');
      }

      // Tag based on response time
      if (avgResponseTime > 0 && avgResponseTime < 60) {
        tags.push('⚡ FASTEST');
      } else if (avgResponseTime > 0 && avgResponseTime < 180) {
        tags.push('✅ FAST');
      }

      // Tag based on availability
      if (helper.isAvailable) {
        tags.push('✓ ONLINE');
      } else {
        tags.push('⏸️ BUSY');
      }

      // Tag busy helpers
      const activeRequests = await EmergencyRequest.countDocuments({
        helperId: helper._id,
        status: { $in: ['accepted', 'in_progress'] },
      });

      if (activeRequests >= 3) {
        tags.push('📞 BUSY');
      } else if (activeRequests > 0) {
        tags.push(`📞 ${activeRequests} ACTIVE`);
      }

      return {
        ...helper,
        tags,
        metrics: {
          rating: avgRating,
          responseTime: Math.round(avgResponseTime),
          completedRequests: helperRequests.length,
          activeRequests,
        },
      };
    })
  );

  return taggedHelpers;
};

/**
 * Get request recommendations with tags
 */
export const getRecommendedHelpers = async (
  requestId: string,
  limit = 5
) => {
  const request = await EmergencyRequest.findById(requestId);

  if (!request) {
    throw new Error('Request not found');
  }

  const [lon, lat] = request.location.coordinates;

  // Find nearby available helpers
  const helpers = await Profile.aggregate([
    {
      $match: {
        role: 'helper',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            $maxDistance: 10000, // 10km
          },
        },
        isAvailable: true,
      },
    },
    {
      $addFields: {
        distanceKm: {
          $divide: [
            {
              $getField: 'distance',
            },
            1000,
          ],
        },
      },
    },
    { $limit: limit * 2 }, // Get more than needed for filtering
  ]);

  // Add tags to each helper
  const taggedHelpers = await tagHelpers(request, helpers);

  // Sort by distance (nearest first), then by rating
  const sorted = taggedHelpers
    .sort((a, b) => {
      if (a.metrics.rating !== b.metrics.rating) {
        return b.metrics.rating - a.metrics.rating;
      }
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);

  return {
    requestId: request.id,
    requestTags: await tagRequest(request),
    recommendedHelpers: sorted,
  };
};

/**
 * Scoring algorithm for matching helpers to requests
 */
export const calculateHelperScore = async (
  helper: any,
  request: IEmergencyRequest
): Promise<number> => {
  let score = 0;

  // Distance score (0-30 points)
  const distance = helper.distanceKm || 0;
  if (distance < 2) {
    score += 30;
  } else if (distance < 5) {
    score += 20;
  } else if (distance < 10) {
    score += 10;
  }

  // Rating score (0-30 points)
  const ratings = await Rating.find({ giverId: helper._id }).lean();
  if (ratings.length > 0) {
    const avgRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    score += Math.min(30, avgRating * 6); // 5-star = 30 points
  }

  // Availability score (0-20 points)
  if (helper.isAvailable) {
    score += 20;
  }

  // Response time score (0-20 points)
  const helperRequests = await EmergencyRequest.find({
    helperId: helper._id,
  }).lean();

  if (helperRequests.length > 0) {
    const avgResponseTime =
      helperRequests
        .filter((r: any) => r.helperResponseTime)
        .reduce((sum: number, r: any) => sum + (r.helperResponseTime || 0), 0) /
      helperRequests.length;

    if (avgResponseTime < 60) {
      score += 20;
    } else if (avgResponseTime < 300) {
      score += 15;
    } else if (avgResponseTime < 600) {
      score += 10;
    }
  }

  // Load score: reduce score if helper is busy (0-5 point penalty)
  const activeRequests = await EmergencyRequest.countDocuments({
    helperId: helper._id,
    status: { $in: ['accepted', 'in_progress'] },
  });

  if (activeRequests >= 3) {
    score -= 5;
  } else if (activeRequests >= 1) {
    score -= activeRequests * 1;
  }

  return Math.max(0, score);
};

export default {
  tagRequest,
  tagHelpers,
  getRecommendedHelpers,
  calculateHelperScore,
};
