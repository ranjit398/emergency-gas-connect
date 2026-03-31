// hooks/usePriorityEngine.ts
// Drop into: frontend/src/hooks/usePriorityEngine.ts

import { useMemo } from 'react';

export type UrgencyLevel = 'high' | 'medium' | 'low';
export type PriorityScore = { score: number; level: UrgencyLevel; label: string; color: string };

export interface RawRequest {
  id: string;
  seekerId: string;
  cylinderType: 'LPG' | 'CNG';
  status: string;
  message: string | null;
  address: string;
  createdAt: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  quantity: number;
  seeker?: { fullName?: string; email: string };
}

export interface ScoredRequest extends RawRequest {
  priority: PriorityScore;
  distanceKm: number | null;
  minutesAgo: number;
}

//  Scoring constants
const WEIGHTS = {
  timeSinceRequest: 0.35,  // older = more urgent
  urgencyFromMessage: 0.40, // keyword detection
  distance: 0.25,           // closer = higher priority for helper
};

const URGENCY_KEYWORDS = {
  high: ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'no gas', 'baby', 'hospital', 'sick', 'child', 'infant'],
  medium: ['need', 'soon', 'quickly', 'please', 'help'],
};

function detectUrgencyFromMessage(message: string | null): number {
  if (!message) return 0.3;
  const lower = message.toLowerCase();
  if (URGENCY_KEYWORDS.high.some((k) => lower.includes(k))) return 1.0;
  if (URGENCY_KEYWORDS.medium.some((k) => lower.includes(k))) return 0.6;
  return 0.3;
}

function timeScore(createdAt: string): number {
  const msAgo = Date.now() - new Date(createdAt).getTime();
  const minutesAgo = msAgo / 60000;
  // Peaks at 30 min, saturates after 120 min
  return Math.min(minutesAgo / 30, 1.0);
}

function distanceScore(distanceKm: number | null): number {
  if (distanceKm === null) return 0.5;
  // Closer = higher score (inverted)
  return Math.max(0, 1 - distanceKm / 20);
}

function compositeScore(
  createdAt: string,
  message: string | null,
  distanceKm: number | null
): number {
  const ts = timeScore(createdAt);
  const us = detectUrgencyFromMessage(message);
  const ds = distanceScore(distanceKm);
  return (
    ts * WEIGHTS.timeSinceRequest +
    us * WEIGHTS.urgencyFromMessage +
    ds * WEIGHTS.distance
  );
}

function toPriorityLevel(score: number): UrgencyLevel {
  if (score >= 0.65) return 'high';
  if (score >= 0.38) return 'medium';
  return 'low';
}

const PRIORITY_META: Record<UrgencyLevel, { label: string; color: string }> = {
  high: { label: ' Critical', color: '#ef4444' },
  medium: { label: ' Moderate', color: '#f59e0b' },
  low: { label: ' Standard', color: '#22c55e' },
};

function calcDistance(
  userLat: number,
  userLng: number,
  reqLng: number,
  reqLat: number
): number {
  const R = 6371;
  const dLat = ((reqLat - userLat) * Math.PI) / 180;
  const dLon = ((reqLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((reqLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UsePriorityEngineOptions {
  userLocation?: { lat: number; lng: number } | null;
  sortBy?: 'priority' | 'distance' | 'time';
}

export function usePriorityEngine(
  requests: RawRequest[],
  { userLocation, sortBy = 'priority' }: UsePriorityEngineOptions = {}
): ScoredRequest[] {
  return useMemo(() => {
    const scored: ScoredRequest[] = requests.map((req) => {
      const [lng, lat] = req.location.coordinates;
      const distanceKm =
        userLocation ? calcDistance(userLocation.lat, userLocation.lng, lng, lat) : null;

      const minutesAgo = Math.floor(
        (Date.now() - new Date(req.createdAt).getTime()) / 60000
      );

      const score = compositeScore(req.createdAt, req.message, distanceKm);
      const level = toPriorityLevel(score);

      return {
        ...req,
        distanceKm,
        minutesAgo,
        priority: {
          score,
          level,
          ...PRIORITY_META[level],
        },
      };
    });

    // Sort
    return scored.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      }
      if (sortBy === 'time') {
        return b.minutesAgo - a.minutesAgo;
      }
      // Default: priority score descending
      return b.priority.score - a.priority.score;
    });
  }, [requests, userLocation, sortBy]);
}