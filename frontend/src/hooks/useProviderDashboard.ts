// frontend/src/hooks/useProviderDashboard.ts
// Complete hook — fetches all provider data, listens to socket events

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { toast } from 'react-toastify';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  provider: {
    id: string; businessName: string; businessType: string;
    isVerified: boolean; contactNumber: string; address: string;
    operatingHours: { open: string; close: string };
  };
  stats: {
    totalRequests: number; completedRequests: number;
    pendingRequests: number; activeRequests: number; cancelledRequests: number;
    todayCompleted: number; weekCompleted: number; monthCompleted: number;
    nearbyPending: number; activeHelperCount: number;
    successRate: number; successRateLabel: string;
  };
  performance: { averageRating: number; totalRatings: number; avgResponseMin: number; avgResponseLabel: string };
  inventory: { lpgStock: number; cngStock: number; totalStock: number; stockStatus: string };
  sevenDaySeries: { date: string; label: string; fulfilled: number; revenue: number }[];
  alerts: { type: string; message: string; severity: 'info'|'warning'|'critical' }[];
  fetchedAt: string;
}

export interface HelperData {
  id: string; userId: string; fullName: string; email: string;
  isAvailable: boolean; activeNow: boolean;
  completedForProvider: number; completedRequests: number;
  rating: number; totalRealRatings: number;
  avgResponseTimeMin: number; verificationStatus: string;
  tags: string[];
  currentRequest?: any;
}

export interface RequestData {
  id: string; cylinderType: string; quantity: number; status: string;
  address: string; message: string | null;
  seekerName: string; seekerPhone: string; seekerEmail: string;
  helperName: string | null; helperPhone: string | null;
  priorityLevel: string; priorityScore: number;
  minutesAgo: number; durationMin: number | null;
  createdAt: string; assignedAt: string | null; completedAt: string | null;
}

export interface ActivityEvent {
  id: string; type: string; emoji: string; message: string;
  timestamp: string; requestId: string; priority: string;
}

export interface Insights {
  successRate: number; successRateLabel: string;
  avgResponseMin: number; fastestResponseMin: number;
  totalRequests: number; completedTotal: number;
  ratingDistribution: Record<number, number>;
  cylinderBreakdown: Record<string, number>;
  busiestHour: { hour: number; count: number } | null;
  grade: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────
const providerApi = {
  getDashboard: ()                       => api.get('/provider/dashboard'),
  getHelpers:   ()                       => api.get('/provider/helpers'),
  getRequests:  (page=1, status='all')   => api.get('/provider/requests', { params: { page, limit: 20, status } }),
  getActivity:  ()                       => api.get('/provider/activity'),
  getInsights:  ()                       => api.get('/provider/insights'),
  getInventory: ()                       => api.get('/provider/inventory'),
  updateInventory: (lpgStock: number, cngStock: number) =>
    api.put('/provider/inventory', { lpgStock, cngStock }),
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useProviderDashboard(autoRefreshMs = 30_000) {
  const [dashboard, setDashboard]   = useState<DashboardStats | null>(null);
  const [helpers, setHelpers]       = useState<{ helpers: HelperData[]; topHelpers: any[]; total: number } | null>(null);
  const [requests, setRequests]     = useState<{ requests: RequestData[]; pagination: any } | null>(null);
  const [activity, setActivity]     = useState<ActivityEvent[]>([]);
  const [insights, setInsights]     = useState<Insights | null>(null);
  const [liveEvents, setLiveEvents] = useState<{ id: string; type: string; message: string; timestamp: Date }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [requestPage, setRequestPage] = useState(1);
  const [requestStatus, setRequestStatus] = useState('all');
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);

  // ── Load all data in parallel ─────────────────────────────────────────────
  const loadAll = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // ✅ Reduce API calls: only fetch helpers/insights/activity on first load
      const [dashRes, helpersRes, reqRes, activityRes, insightsRes] = await Promise.allSettled([
        providerApi.getDashboard(), // Always fetch dashboard (fast)
        silent ? Promise.resolve({ data: { data: helpers } }) : providerApi.getHelpers(), // Skip on silent refresh
        providerApi.getRequests(requestPage, requestStatus), // Always fetch requests (essential)
        silent ? Promise.resolve({ data: { data: activity } }) : providerApi.getActivity(), // Skip on silent refresh
        silent ? Promise.resolve({ data: { data: insights } }) : providerApi.getInsights(), // Skip on silent refresh
      ]);

      if (!mountedRef.current) return;

      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data.data);
      if (helpersRes.status === 'fulfilled') setHelpers(helpersRes.value.data.data);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data);
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data.data ?? []);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.data.data);

      setLastUpdated(new Date());
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.response?.data?.error?.message ?? 'Failed to load dashboard';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [requestPage, requestStatus]);

  useEffect(() => {
    mountedRef.current = true;
    loadAll(false);
    return () => { mountedRef.current = false; };
  }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    timerRef.current = setInterval(() => loadAll(true), autoRefreshMs);
    return () => clearInterval(timerRef.current);
  }, [loadAll, autoRefreshMs]);

  // ── Socket: instant dashboard updates ─────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleDashboardUpdate = (data: any) => {
      const id = `ev_${Date.now()}`;
      if (data.type === 'FULL_REFRESH' && data.data) {
        setDashboard(data.data);
        setLastUpdated(new Date());
      } else {
        // Lightweight event — add to live feed and refresh
        setLiveEvents((prev) => [{
          id, type: data.type,
          message: data.message ?? `Event: ${data.type}`,
          timestamp: new Date(data.timestamp),
        }, ...prev.slice(0, 29)]);
        loadAll(true);
      }
    };

    const handleNewRequest = (d: any) => {
      setLiveEvents((prev) => [{
        id: `new_${Date.now()}`,
        type: 'NEW_REQUEST',
        message: `🆕 New ${d.cylinderType ?? ''} emergency request`,
        timestamp: new Date(),
      }, ...prev.slice(0, 29)]);
      loadAll(true);
    };

    const handleStatusChange = (d: any) => {
      setLiveEvents((prev) => [{
        id: `sc_${Date.now()}`,
        type: d.status === 'completed' ? 'REQUEST_COMPLETED' : 'REQUEST_ACCEPTED',
        message: d.status === 'completed' ? '✅ Request completed' : `⚡ Request accepted by ${d.helperName ?? 'helper'}`,
        timestamp: new Date(),
      }, ...prev.slice(0, 29)]);
      loadAll(true);
    };

    socket.on('dashboard_update',        handleDashboardUpdate);
    socket.on('request:new',             handleNewRequest);
    socket.on('request:status-changed',  handleStatusChange);

    return () => {
      socket.off('dashboard_update',       handleDashboardUpdate);
      socket.off('request:new',            handleNewRequest);
      socket.off('request:status-changed', handleStatusChange);
    };
  }, [loadAll]);

  const updateInventory = async (lpgStock: number, cngStock: number) => {
    await providerApi.updateInventory(lpgStock, cngStock);
    await loadAll(true);
    toast.success('Inventory updated');
  };

  return {
    dashboard, helpers, requests, activity, insights, liveEvents,
    loading, refreshing, error, lastUpdated,
    requestPage, setRequestPage,
    requestStatus, setRequestStatus,
    refresh: () => loadAll(false),
    silentRefresh: () => loadAll(true),
    updateInventory,
  };
}