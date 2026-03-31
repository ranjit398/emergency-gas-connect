// backend/src/services/matching.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Smart Geo-Based Matching Service
//
// Implements Uber-style matching:
//   1. Find candidates using MongoDB $geoNear aggregation
//   2. Score each candidate using recommendation.service
//   3. Sort by matchScore DESC
//   4. Return top N with full labels
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import Profile from '@models/Profile';
import EmergencyRequest from '@models/EmergencyRequest';
import { NotFoundError, ValidationError } from '@middleware/errorHandler';
import {
  buildRecommendations,
  HelperRecommendation,
} from './recommendation.service';
import {
  calculatePriorityScore,
  getPriorityLevel,
  PriorityLevel,
} from './priority.service';
import logger from '@utils/logger';

// ── Haversine distance (km) ────────────────────────────────────────────────
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Find available helpers near coordinates ────────────────────────────────
export async function findNearbyHelpers(params: {
  longitude: number;
  latitude: number;
  maxDistanceKm?: number;
  cylinderType?: 'LPG' | 'CNG';
  limit?: number;
}): Promise<HelperRecommendation[]> {
  const {
    longitude, latitude,
    maxDistanceKm = 15,
    limit = 10,
  } = params;

  // $geoNear must be the first stage and requires a 2dsphere index
  const pipeline: any[] = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'calculatedDistance', // metres
        maxDistance: maxDistanceKm * 1000,
        spherical: true,
        query: {
          role: 'helper',
          isAvailable: true,
          verificationStatus: 'verified',
        },
      },
    },
    {
      $addFields: {
        distanceKm: { $divide: ['$calculatedDistance', 1000] },
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        fullName: 1,
        avatarUrl: 1,
        ratings: 1,
        totalRatings: 1,
        completedRequests: 1,
        avgResponseTimeMin: { $ifNull: ['$avgResponseTimeMin', 15] },
        isAvailable: 1,
        distanceKm: 1,
        location: 1,
      },
    },
    { $limit: limit * 3 }, // Fetch more, rank, trim
  ];

  const rawHelpers = await Profile.aggregate(pipeline);

  if (rawHelpers.length === 0) return [];

  // Build enriched recommendations (labels + matchScore)
  const recommendations = buildRecommendations(
    rawHelpers.map((h) => ({
      _id: h._id,
      fullName: h.fullName,
      avatarUrl: h.avatarUrl ?? null,
      ratings: h.ratings ?? 0,
      totalRatings: h.totalRatings ?? 0,
      completedRequests: h.completedRequests ?? 0,
      avgResponseTimeMin: h.avgResponseTimeMin ?? 15,
      isAvailable: h.isAvailable ?? true,
      distanceKm: h.distanceKm ?? 0,
    }))
  );

  // Sort by matchScore and return top N
  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ── Match for a specific request ───────────────────────────────────────────
export interface RequestMatchResult {
  request: {
    id: string;
    cylinderType: string;
    address: string;
    priorityScore: number;
    priorityLevel: PriorityLevel;
    status: string;
    createdAt: Date;
    coordinates: [number, number];
  };
  topMatches: HelperRecommendation[];
  totalCandidates: number;
  searchRadiusKm: number;
}

export async function matchForRequest(
  requestId: string,
  options: { maxDistanceKm?: number; limit?: number } = {}
): Promise<RequestMatchResult> {
  const { maxDistanceKm = 15, limit = 5 } = options;

  const request = await EmergencyRequest.findById(requestId);
  if (!request) throw new NotFoundError('Request not found');
  if (request.status !== 'pending') {
    throw new ValidationError(`Cannot match: request status is "${request.status}"`);
  }

  const [longitude, latitude] = request.location.coordinates;

  const topMatches = await findNearbyHelpers({
    longitude,
    latitude,
    maxDistanceKm,
    limit,
  });

  // Recalculate priority using best match distance
  const bestDistanceKm = topMatches[0]?.distanceKm ?? null;
  const priorityScore = calculatePriorityScore({
    message: request.message ?? null,
    createdAt: request.createdAt,
    distanceKm: bestDistanceKm,
  });
  const priorityLevel = getPriorityLevel(priorityScore);

  // Persist updated priority
  await EmergencyRequest.findByIdAndUpdate(requestId, { priorityScore, priorityLevel });

  logger.info(
    `[Matching] Request ${requestId}: ${topMatches.length} matches found within ${maxDistanceKm}km`
  );

  return {
    request: {
      id: request._id.toString(),
      cylinderType: request.cylinderType,
      address: request.address,
      priorityScore,
      priorityLevel,
      status: request.status,
      createdAt: request.createdAt,
      coordinates: [longitude, latitude],
    },
    topMatches,
    totalCandidates: topMatches.length,
    searchRadiusKm: maxDistanceKm,
  };
}

// ── Get prioritised pending requests (sorted by score) ─────────────────────
export interface PrioritisedRequest {
  id: string;
  seekerId: string;
  cylinderType: string;
  quantity: number;
  address: string;
  message: string | null;
  status: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  distanceFromUserKm: number | null;
  distanceLabel: string;
  minutesWaiting: number;
  createdAt: Date;
  seeker?: { email: string; fullName?: string };
}

export async function getPrioritisedRequests(params: {
  userLongitude?: number;
  userLatitude?: number;
  maxDistanceKm?: number;
  cylinderType?: string;
  page?: number;
  limit?: number;
}): Promise<{ requests: PrioritisedRequest[]; total: number }> {
  const {
    userLongitude, userLatitude,
    maxDistanceKm = 50,
    cylinderType,
    page = 1,
    limit = 20,
  } = params;

  const skip = (page - 1) * limit;

  let pipeline: any[];

  if (userLongitude !== undefined && userLatitude !== undefined) {
    // Geo-sorted pipeline
    pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [userLongitude, userLatitude] },
          distanceField: 'distanceFromUser',
          maxDistance: maxDistanceKm * 1000,
          spherical: true,
          query: {
            status: 'pending',
            ...(cylinderType ? { cylinderType } : {}),
          },
        },
      },
      {
        $addFields: {
          distanceFromUserKm: { $divide: ['$distanceFromUser', 1000] },
          minutesWaiting: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              60_000,
            ],
          },
        },
      },
      // Sort by priority score first, then distance
      { $sort: { priorityScore: -1, distanceFromUserKm: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'profiles',
          localField: 'seekerId',
          foreignField: 'userId',
          as: 'seekerProfile',
        },
      },
      {
        $addFields: {
          seeker: { $arrayElemAt: ['$seekerProfile', 0] },
        },
      },
    ];
  } else {
    // Non-geo pipeline (all pending, sorted by priority)
    pipeline = [
      {
        $match: {
          status: 'pending',
          ...(cylinderType ? { cylinderType } : {}),
        },
      },
      {
        $addFields: {
          minutesWaiting: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              60_000,
            ],
          },
        },
      },
      { $sort: { priorityScore: -1, createdAt: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'profiles',
          localField: 'seekerId',
          foreignField: 'userId',
          as: 'seekerProfile',
        },
      },
      { $addFields: { seeker: { $arrayElemAt: ['$seekerProfile', 0] } } },
    ];
  }

  const [results, countResult] = await Promise.all([
    EmergencyRequest.aggregate(pipeline),
    EmergencyRequest.countDocuments({
      status: 'pending',
      ...(cylinderType ? { cylinderType } : {}),
    }),
  ]);

  const requests: PrioritisedRequest[] = results.map((r) => ({
    id: r._id.toString(),
    seekerId: r.seekerId?.toString(),
    cylinderType: r.cylinderType,
    quantity: r.quantity ?? 1,
    address: r.address,
    message: r.message ?? null,
    status: r.status,
    priorityScore: r.priorityScore ?? 0,
    priorityLevel: (r.priorityLevel ?? 'low') as PriorityLevel,
    distanceFromUserKm: r.distanceFromUserKm != null
      ? Math.round(r.distanceFromUserKm * 100) / 100
      : null,
    distanceLabel: r.distanceFromUserKm != null
      ? (r.distanceFromUserKm < 1
        ? `${Math.round(r.distanceFromUserKm * 1000)}m`
        : `${r.distanceFromUserKm.toFixed(1)}km`)
      : '—',
    minutesWaiting: Math.floor(r.minutesWaiting ?? 0),
    createdAt: r.createdAt,
    seeker: r.seeker
      ? { email: r.seeker.email, fullName: r.seeker.fullName }
      : undefined,
  }));

  return { requests, total: countResult };
}