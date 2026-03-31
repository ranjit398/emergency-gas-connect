// backend/src/services/priority.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Emergency Priority Scoring Engine
//
// Formula:
//   priorityScore = urgencyWeight + timeElapsedWeight + distanceFactor
//
// Weights:
//   urgencyWeight    → 0–40  (from message keyword analysis)
//   timeElapsedWeight → 0–35 (older pending = more urgent)
//   distanceFactor   → 0–25  (passed in from calling context)
//
// Score range: 0–100 (higher = more urgent)
// ─────────────────────────────────────────────────────────────────────────────

import EmergencyRequest from './models/EmergencyRequest';
import logger from './utils/logger';

// ── Keyword urgency dictionaries ─────────────────────────────────────────────
const HIGH_URGENCY_KEYWORDS = [
  'urgent', 'emergency', 'immediately', 'asap', 'critical',
  'no gas', 'baby', 'infant', 'hospital', 'sick', 'child',
  'medicine', 'oxygen', 'diabetic', 'elderly', 'old person',
  'pregnant', 'newborn', 'ambulance', 'fire', 'dangerous',
];

const MEDIUM_URGENCY_KEYWORDS = [
  'need', 'soon', 'quickly', 'please', 'help', 'fast',
  'running out', 'almost empty', 'little left', 'tonight',
  'today', 'this evening', 'morning',
];

// ── Urgency score from message content ───────────────────────────────────────
export function scoreUrgencyFromMessage(message: string | null | undefined): number {
  if (!message) return 10; // No message → low-medium baseline

  const lower = message.toLowerCase();

  if (HIGH_URGENCY_KEYWORDS.some((kw) => lower.includes(kw))) return 40;
  if (MEDIUM_URGENCY_KEYWORDS.some((kw) => lower.includes(kw))) return 22;
  return 10;
}

// ── Time elapsed score (older pending requests get higher score) ──────────────
export function scoreTimeElapsed(createdAt: Date): number {
  const minutesElapsed = (Date.now() - createdAt.getTime()) / 60_000;

  if (minutesElapsed <= 5)   return 5;   // very fresh
  if (minutesElapsed <= 15)  return 12;
  if (minutesElapsed <= 30)  return 20;
  if (minutesElapsed <= 60)  return 27;
  if (minutesElapsed <= 120) return 32;
  return 35; // max — waiting over 2 hours
}

// ── Distance factor (lower distance = higher score for helpers) ───────────────
export function scoreDistance(distanceKm: number | null | undefined): number {
  if (distanceKm === null || distanceKm === undefined) return 10; // unknown → neutral

  if (distanceKm <= 1)   return 25;
  if (distanceKm <= 2)   return 22;
  if (distanceKm <= 5)   return 17;
  if (distanceKm <= 10)  return 12;
  if (distanceKm <= 20)  return 6;
  return 2; // very far
}

// ── Composite priority score ──────────────────────────────────────────────────
export function calculatePriorityScore(params: {
  message: string | null | undefined;
  createdAt: Date;
  distanceKm?: number | null;
}): number {
  const urgency  = scoreUrgencyFromMessage(params.message);
  const time     = scoreTimeElapsed(params.createdAt);
  const distance = scoreDistance(params.distanceKm ?? null);
  return Math.min(100, urgency + time + distance);
}

// ── Priority level label ──────────────────────────────────────────────────────
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

// ── Recalculate and persist priorityScore on a request ───────────────────────
export async function refreshRequestPriority(
  requestId: string,
  distanceKm?: number
): Promise<number> {
  const request = await EmergencyRequest.findById(requestId);
  if (!request) return 0;

  const score = calculatePriorityScore({
    message: request.message ?? null,
    createdAt: request.createdAt,
    distanceKm,
  });

  await EmergencyRequest.findByIdAndUpdate(requestId, {
    priorityScore: score,
    priorityLevel: getPriorityLevel(score),
  });

  return score;
}

// ── Bulk recalculate all pending requests (call via cron or admin endpoint) ───
export async function bulkRefreshPriorities(): Promise<number> {
  const pending = await EmergencyRequest.find({ status: 'pending' });
  let updated = 0;

  for (const req of pending) {
    const score = calculatePriorityScore({
      message: req.message ?? null,
      createdAt: req.createdAt,
    });
    await EmergencyRequest.findByIdAndUpdate(req._id, {
      priorityScore: score,
      priorityLevel: getPriorityLevel(score),
    });
    updated++;
  }

  logger.info(`[Priority] Bulk refreshed ${updated} requests`);
  return updated;
}