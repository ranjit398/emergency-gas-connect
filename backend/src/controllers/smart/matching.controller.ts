// backend/src/controllers/smart/matching.controller.ts

import { Request, Response } from 'express';
import { asyncHandler } from '@middleware/index';
import { success, paginated } from '@utils/response';
import { matchForRequest, findNearbyHelpers, getPrioritisedRequests } from '@services/matching.service';
import { bulkRefreshPriorities } from '@services/priority.service';
import { NotFoundError, ValidationError } from '@middleware/errorHandler';

export class MatchingController {

  // ── GET /api/v1/match/:requestId ──────────────────────────────────────────
  // Returns top 5 helpers for a specific request with labels + matchScore
  getMatchesForRequest = asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const maxDistanceKm = parseInt(req.query.radius as string) || 15;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

    const result = await matchForRequest(requestId, { maxDistanceKm, limit });

    res.json(
      success(
        {
          request: result.request,
          matches: result.topMatches,
          meta: {
            totalCandidates: result.totalCandidates,
            searchRadiusKm: result.searchRadiusKm,
            bestMatchScore: result.topMatches[0]?.matchScore ?? null,
          },
        },
        `Found ${result.topMatches.length} matches`
      )
    );
  });

  // ── GET /api/v1/match/nearby-helpers ─────────────────────────────────────
  // Returns helpers near a coordinate (used by frontend map / seeker view)
  getNearbyHelpers = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius, limit } = req.query;

    if (!latitude || !longitude) {
      throw new ValidationError('latitude and longitude are required');
    }

    const helpers = await findNearbyHelpers({
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      maxDistanceKm: parseInt(radius as string) || 10,
      limit: Math.min(parseInt(limit as string) || 10, 20),
    });

    res.json(
      success(
        { helpers, total: helpers.length },
        `Found ${helpers.length} nearby helpers`
      )
    );
  });

  // ── GET /api/v1/match/prioritised-requests ────────────────────────────────
  // Returns pending requests sorted by priorityScore (for helpers)
  getPrioritisedRequests = asyncHandler(async (req: Request, res: Response) => {
    const {
      latitude, longitude,
      radius, cylinderType,
      page, limit,
    } = req.query;

    const result = await getPrioritisedRequests({
      userLatitude: latitude ? parseFloat(latitude as string) : undefined,
      userLongitude: longitude ? parseFloat(longitude as string) : undefined,
      maxDistanceKm: parseInt(radius as string) || 50,
      cylinderType: cylinderType as string | undefined,
      page: parseInt(page as string) || 1,
      limit: Math.min(parseInt(limit as string) || 20, 50),
    });

    res.json(
      paginated(
        result.requests,
        parseInt(page as string) || 1,
        Math.min(parseInt(limit as string) || 20, 50),
        result.total
      )
    );
  });

  // ── POST /api/v1/match/refresh-priorities ─────────────────────────────────
  // Admin endpoint: recalculates priorityScore for all pending requests
  refreshPriorities = asyncHandler(async (req: Request, res: Response) => {
    const updated = await bulkRefreshPriorities();
    res.json(success({ updated }, `Refreshed priority for ${updated} requests`));
  });
}

export default new MatchingController();