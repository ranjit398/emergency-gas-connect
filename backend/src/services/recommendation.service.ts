// backend/src/services/recommendation.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Recommendation Engine
//
// Takes a matched helper and applies deterministic rules to produce:
//   - Human-readable labels ("⚡ Fastest Response", "⭐ Trusted Helper" etc.)
//   - A composite matchScore (0–100)
//   - A recommendation reason for the UI
//
// Rules are intentionally explicit and easy to tune — no black box.
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationLabel =
  | '📍 Nearest'
  | '⚡ Fastest Response'
  | '⭐ Trusted Helper'
  | '🛡️ Most Reliable'
  | '🔥 Top Rated'
  | '✅ Experienced'
  | '🆕 New Helper';

export interface HelperRecommendation {
  helperId: string;
  fullName: string;
  avatarUrl: string | null;
  distanceKm: number;
  distanceLabel: string;       // "850m" or "3.2km"
  estimatedArrivalMin: number; // rough estimate
  rating: number;
  totalRatings: number;
  completedRequests: number;
  avgResponseTimeMin: number;
  isAvailable: boolean;
  labels: RecommendationLabel[];
  primaryLabel: RecommendationLabel | null;
  matchScore: number;          // 0–100
  matchReason: string;         // human-readable explanation
}

// ── Thresholds (tune here) ────────────────────────────────────────────────────
const THRESHOLDS = {
  nearest_km: 2,           // < 2km → Nearest
  trusted_rating: 4.0,     // ≥ 4.0 → Trusted
  topRated_rating: 4.7,    // ≥ 4.7 + ≥ 20 ratings → Top Rated
  experienced_requests: 30, // ≥ 30 completions → Experienced
  reliable_requests: 100,   // ≥ 100 completions → Most Reliable
  fast_response_min: 8,     // ≤ 8 min avg response → Fastest
};

// ── Haversine distance label formatter ───────────────────────────────────────
export function formatDistanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ── Estimated arrival (simple urban model: 20km/h + 2min wait) ───────────────
export function estimateArrivalMin(distanceKm: number): number {
  const driveMin = Math.ceil((distanceKm / 20) * 60);
  return driveMin + 2; // 2 min preparation buffer
}

// ── Assign labels to a single helper ─────────────────────────────────────────
export function assignLabels(helper: {
  distanceKm: number;
  rating: number;
  totalRatings: number;
  completedRequests: number;
  avgResponseTimeMin: number;
  isNearestInSet?: boolean;
  isFastestInSet?: boolean;
}): RecommendationLabel[] {
  const labels: RecommendationLabel[] = [];

  if (helper.isNearestInSet) {
    labels.push('📍 Nearest');
  } else if (helper.distanceKm <= THRESHOLDS.nearest_km) {
    labels.push('📍 Nearest');
  }

  if (helper.isFastestInSet || helper.avgResponseTimeMin <= THRESHOLDS.fast_response_min) {
    labels.push('⚡ Fastest Response');
  }

  if (helper.rating >= THRESHOLDS.topRated_rating && helper.totalRatings >= 20) {
    labels.push('🔥 Top Rated');
  } else if (helper.rating >= THRESHOLDS.trusted_rating) {
    labels.push('⭐ Trusted Helper');
  }

  if (helper.completedRequests >= THRESHOLDS.reliable_requests) {
    labels.push('🛡️ Most Reliable');
  } else if (helper.completedRequests >= THRESHOLDS.experienced_requests) {
    labels.push('✅ Experienced');
  }

  if (helper.completedRequests < 5 && helper.totalRatings < 3) {
    labels.push('🆕 New Helper');
  }

  return labels;
}

// ── Compute match score (0–100) ───────────────────────────────────────────────
export function computeMatchScore(helper: {
  distanceKm: number;
  rating: number;
  totalRatings: number;
  completedRequests: number;
  avgResponseTimeMin: number;
}): number {
  // Distance: max 35 pts (closer is better)
  const distScore = Math.max(0, 35 - (helper.distanceKm / 20) * 35);

  // Rating: max 30 pts
  const ratingScore = (helper.rating / 5) * 30;

  // Experience: max 20 pts (saturates at 200 completions)
  const expScore = Math.min(20, (helper.completedRequests / 200) * 20);

  // Response time: max 15 pts (faster = higher)
  const responseScore = Math.max(0, 15 - (helper.avgResponseTimeMin / 30) * 15);

  return Math.round(Math.min(100, distScore + ratingScore + expScore + responseScore));
}

// ── Generate reason string ────────────────────────────────────────────────────
export function generateMatchReason(
  labels: RecommendationLabel[],
  distanceKm: number,
  matchScore: number
): string {
  if (labels.includes('📍 Nearest') && labels.includes('⚡ Fastest Response')) {
    return `Closest helper with the fastest response time — ideal for emergencies`;
  }
  if (labels.includes('🔥 Top Rated') || labels.includes('⭐ Trusted Helper')) {
    return `Highly rated by the community with proven reliability`;
  }
  if (labels.includes('📍 Nearest')) {
    return `Only ${formatDistanceLabel(distanceKm)} away — can arrive quickly`;
  }
  if (labels.includes('⚡ Fastest Response')) {
    return `Consistently responds faster than other helpers in the area`;
  }
  if (labels.includes('🛡️ Most Reliable')) {
    return `Has completed the most requests with high reliability`;
  }
  if (matchScore >= 70) return 'Strong overall match based on proximity, rating, and experience';
  if (matchScore >= 50) return 'Good match — available and nearby';
  return 'Available helper in your area';
}

// ── Full recommendation builder ───────────────────────────────────────────────
// Takes raw DB results + pre-computed distances, returns enriched recommendations
export function buildRecommendations(
  helpers: Array<{
    _id: any;
    fullName: string;
    avatarUrl: string | null;
    ratings: number;
    totalRatings: number;
    completedRequests: number;
    avgResponseTimeMin: number;
    isAvailable: boolean;
    distanceKm: number;
  }>
): HelperRecommendation[] {
  if (helpers.length === 0) return [];

  // Find the nearest and fastest for relative badge assignment
  const nearestId = [...helpers].sort((a, b) => a.distanceKm - b.distanceKm)[0]._id.toString();
  const fastestId = [...helpers]
    .filter((h) => h.avgResponseTimeMin > 0)
    .sort((a, b) => a.avgResponseTimeMin - b.avgResponseTimeMin)[0]?._id.toString();

  return helpers.map((h) => {
    const id = h._id.toString();
    const labels = assignLabels({
      distanceKm: h.distanceKm,
      rating: h.ratings,
      totalRatings: h.totalRatings,
      completedRequests: h.completedRequests,
      avgResponseTimeMin: h.avgResponseTimeMin,
      isNearestInSet: id === nearestId,
      isFastestInSet: id === fastestId,
    });

    const matchScore = computeMatchScore({
      distanceKm: h.distanceKm,
      rating: h.ratings,
      totalRatings: h.totalRatings,
      completedRequests: h.completedRequests,
      avgResponseTimeMin: h.avgResponseTimeMin,
    });

    return {
      helperId: id,
      fullName: h.fullName,
      avatarUrl: h.avatarUrl,
      distanceKm: Math.round(h.distanceKm * 100) / 100,
      distanceLabel: formatDistanceLabel(h.distanceKm),
      estimatedArrivalMin: estimateArrivalMin(h.distanceKm),
      rating: h.ratings,
      totalRatings: h.totalRatings,
      completedRequests: h.completedRequests,
      avgResponseTimeMin: h.avgResponseTimeMin,
      isAvailable: h.isAvailable,
      labels,
      primaryLabel: labels[0] ?? null,
      matchScore,
      matchReason: generateMatchReason(labels, h.distanceKm, matchScore),
    };
  });
}