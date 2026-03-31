// hooks/useSmartMatch.ts
// Drop into: frontend/src/hooks/useSmartMatch.ts

import { useMemo } from 'react';

export interface HelperProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  ratings: number;
  totalRatings: number;
  completedRequests: number;
  isAvailable: boolean;
  location?: { type: 'Point'; coordinates: [number, number] } | null;
  avgResponseMinutes?: number; // optional: from historical data
}

export type MatchBadge =
  | 'fastest'
  | 'nearest'
  | 'trusted'
  | 'experienced'
  | 'top_rated';

export interface MatchedHelper extends HelperProfile {
  distanceKm: number | null;
  matchScore: number;
  badges: MatchBadge[];
  badgeLabels: string[];
  estimatedArrivalMin: number | null;
}

function calcDistance(
  uLat: number, uLng: number, hLng: number, hLat: number
): number {
  const R = 6371;
  const dLat = ((hLat - uLat) * Math.PI) / 180;
  const dLon = ((hLng - uLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((uLat * Math.PI) / 180) *
      Math.cos((hLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateArrival(distanceKm: number | null): number | null {
  if (distanceKm === null) return null;
  // Assume avg 20km/h in urban traffic
  return Math.ceil((distanceKm / 20) * 60);
}

function computeMatchScore(helper: HelperProfile, distanceKm: number | null): number {
  const ratingScore = (helper.ratings / 5) * 0.35;
  const experienceScore = Math.min(helper.completedRequests / 100, 1) * 0.20;
  const distScore = distanceKm !== null ? Math.max(0, 1 - distanceKm / 15) * 0.35 : 0.15;
  const responseScore = helper.avgResponseMinutes
    ? Math.max(0, 1 - helper.avgResponseMinutes / 30) * 0.10
    : 0.05;
  return ratingScore + experienceScore + distScore + responseScore;
}

function assignBadges(
  helper: HelperProfile,
  _distanceKm: number | null,
  allHelpers: Array<{ id: string; distanceKm: number | null; ratings: number; avgResponseMinutes?: number }>
): { badges: MatchBadge[]; labels: string[] } {
  const badges: MatchBadge[] = [];
  const labels: string[] = [];

  // Nearest
  const sortedByDist = [...allHelpers]
    .filter((h) => h.distanceKm !== null)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  if (sortedByDist[0]?.id === helper.id) {
    badges.push('nearest');
    labels.push('📍 Nearest');
  }

  // Top rated
  if (helper.ratings >= 4.5 && helper.totalRatings >= 10) {
    badges.push('top_rated');
    labels.push('⭐ Top Rated');
  }

  // Trusted (many completions)
  if (helper.completedRequests >= 50) {
    badges.push('trusted');
    labels.push('🛡️ Trusted Helper');
  } else if (helper.completedRequests >= 20) {
    badges.push('experienced');
    labels.push('✅ Experienced');
  }

  // Fastest responder
  const sortedByResp = [...allHelpers]
    .filter((h) => h.avgResponseMinutes !== undefined)
    .sort((a, b) => (a.avgResponseMinutes ?? 999) - (b.avgResponseMinutes ?? 999));
  if (sortedByResp[0]?.id === helper.id) {
    badges.push('fastest');
    labels.push('⚡ Fastest Response');
  }

  return { badges, labels };
}

export function useSmartMatch(
  helpers: HelperProfile[],
  userLocation?: { lat: number; lng: number } | null,
  topN = 5
): MatchedHelper[] {
  return useMemo(() => {
    const available = helpers.filter((h) => h.isAvailable);

    // First pass: compute distances
    const withDist = available.map((h) => {
      const coords = h.location?.coordinates;
      const distanceKm =
        userLocation && coords
          ? calcDistance(userLocation.lat, userLocation.lng, coords[0], coords[1])
          : null;
      return { ...h, distanceKm };
    });

    // Build reference list for badge computation
    const refList = withDist.map((h) => ({
      id: h.id,
      distanceKm: h.distanceKm,
      ratings: h.ratings,
      avgResponseMinutes: h.avgResponseMinutes,
    }));

    // Score and badge
    const matched: MatchedHelper[] = withDist.map((h) => {
      const matchScore = computeMatchScore(h, h.distanceKm);
      const { badges, labels } = assignBadges(h, h.distanceKm, refList);
      return {
        ...h,
        matchScore,
        badges,
        badgeLabels: labels,
        estimatedArrivalMin: estimateArrival(h.distanceKm),
      };
    });

    return matched.sort((a, b) => b.matchScore - a.matchScore).slice(0, topN);
  }, [helpers, userLocation, topN]);
}