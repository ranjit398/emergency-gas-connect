// frontend/src/hooks/useLiveData.ts
// Universal hook — works for provider, helper, and seeker
// Auto-refreshes + listens to socket events for instant updates

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { toast } from 'react-toastify';

export type LiveRole = 'provider' | 'helper' | 'seeker';

// ── Shared base ───────────────────────────────────────────────────────────────
interface BaseLiveData {
  role: LiveRole;
  unreadMessages: number;
  fetchedAt: string;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export interface ProviderLiveData extends BaseLiveData {
  role: 'provider';
  provider: {
    id: string; businessName: string; businessType: string;
    isVerified: boolean; contactNumber: string; address: string;
    operatingHours: { open: string; close: string };
    inventory: { type: string; quantity: number }[];
    totalStock: number;
    stockStatus: 'empty' | 'low' | 'medium' | 'healthy';
  };
  stats: {
    totalRequests: number; activeRequests: number;
    completedRequests: number; cancelledRequests: number;
    nearbyPending: number; todayCompleted: number; monthCompleted: number;
    responseRate: number; responseRateLabel: string;
  };
  ratings: {
    average: number; total: number;
    distribution: Record<number, number>;
    recent: { score: number; review: string; reviewer: string; date: string }[];
  };
  nearbyRequests: NearbyRequest[];
  recentActivity: ActivityItem[];
  sevenDaySeries: SeriesEntry[];
}

// ── Helper ────────────────────────────────────────────────────────────────────
export interface HelperLiveData extends BaseLiveData {
  role: 'helper';
  helper: {
    id: string; fullName: string; isAvailable: boolean;
    rating: number; totalRatings: number;
    completedRequests: number; avgResponseTimeMin: number;
    verificationStatus: string;
  };
  stats: {
    totalAccepted: number; totalCompleted: number;
    activeNow: number; earningsThisMonth: number;
    completionRate: number; completionRateLabel: string;
  };
  pendingNearby: NearbyRequest[];
  myRequests: RequestItem[];
}

// ── Seeker ────────────────────────────────────────────────────────────────────
export interface SeekerLiveData extends BaseLiveData {
  role: 'seeker';
  seeker: { id: string; fullName: string; avatarUrl: string | null };
  stats: {
    pending: number; accepted: number;
    completed: number; cancelled: number; total: number;
  };
  myRequests: RequestItem[];
  recentHelpers: RecentHelper[];
}

// ── Shared types ──────────────────────────────────────────────────────────────
export interface NearbyRequest {
  id: string; cylinderType: string; quantity: number;
  address: string; message: string | null;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number; distanceKm: number;
  seekerName: string; minutesAgo: number;
  canFulfill?: boolean;
}

export interface RequestItem {
  id: string; cylinderType: string; quantity: number;
  address: string; status: string; message: string | null;
  priorityLevel: string; priorityScore: number;
  seekerName?: string; helperName?: string;
  seekerPhone?: string; helperPhone?: string;
  helperRating?: number;
  minutesAgo: number; createdAt: string;
  completedAt?: string; assignedAt?: string;
}

export interface ActivityItem {
  id: string; status: string; cylinderType: string;
  quantity: number; address: string;
  completedAt?: string; createdAt: string; priorityLevel: string;
}

export interface SeriesEntry {
  date: string; label: string; fulfilled: number; revenue: number;
}

export interface RecentHelper {
  helperId: string; fullName: string;
  rating: number; avatarUrl: string | null; timesHelped: number;
}

export type LiveData = ProviderLiveData | HelperLiveData | SeekerLiveData;

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLiveData(role?: LiveRole, autoRefreshMs = 60_000) {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newEvents, setNewEvents] = useState<{ id: string; message: string; type: string; time: Date }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const socketRefreshTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const endpoint = role ? `/live/${role}` : '/live/me';

  const load = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await api.get(endpoint);
      if (!mountedRef.current) return;
      setData(res.data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'Failed to load data';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [endpoint]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    load(false);
    return () => { mountedRef.current = false; };
  }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    timerRef.current = setInterval(() => load(true), autoRefreshMs);
    return () => clearInterval(timerRef.current);
  }, [load, autoRefreshMs]);

  // Socket: instant updates on key events (debounced to avoid rate limit)
  useEffect(() => {
    const socket = getSocket();

    const addEvent = (message: string, type: string) => {
      const id = `ev_${Date.now()}_${Math.random()}`;
      setNewEvents((prev) => [{ id, message, type, time: new Date() }, ...prev.slice(0, 19)]);
    };

    // Debounced refresh: only refresh once even if multiple socket events fire
    const debouncedRefresh = () => {
      if (socketRefreshTimerRef.current) clearTimeout(socketRefreshTimerRef.current);
      socketRefreshTimerRef.current = setTimeout(() => {
        load(true);
      }, 2000); // Wait 2s to batch multiple socket events
    };

    socket.on('request:new', (d: any) => {
      addEvent(`🚨 New ${d.cylinderType ?? ''} emergency request nearby`, 'NEW_REQUEST');
      debouncedRefresh();
    });
    socket.on('request:status-changed', (d: any) => {
      if (d.status === 'accepted') addEvent(`⚡ Request accepted`, 'ACCEPTED');
      if (d.status === 'completed') addEvent(`✅ Request completed`, 'COMPLETED');
      debouncedRefresh();
    });
    socket.on('notification:request-accepted', () => {
      addEvent('✅ Your request was accepted!', 'ACCEPTED');
      debouncedRefresh();
    });
    socket.on('activity:new', (d: any) => {
      addEvent(d.message, d.type);
      debouncedRefresh();
    });

    return () => {
      socket.off('request:new');
      socket.off('request:status-changed');
      socket.off('notification:request-accepted');
      socket.off('activity:new');
      if (socketRefreshTimerRef.current) clearTimeout(socketRefreshTimerRef.current);
    };
  }, [load]);

  const refresh = () => load(false);
  const silentRefresh = () => load(true);
  const clearEvents = () => setNewEvents([]);

  return {
    data, loading, refreshing, error,
    lastUpdated, newEvents,
    refresh, silentRefresh, clearEvents,
    isProvider: data?.role === 'provider',
    isHelper:   data?.role === 'helper',
    isSeeker:   data?.role === 'seeker',
    providerData: data?.role === 'provider' ? (data as ProviderLiveData) : null,
    helperData:   data?.role === 'helper'   ? (data as HelperLiveData)   : null,
    seekerData:   data?.role === 'seeker'   ? (data as SeekerLiveData)   : null,
  };
}
