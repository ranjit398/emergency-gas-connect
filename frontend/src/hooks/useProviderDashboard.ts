// frontend/src/hooks/useProviderDashboard.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { providerDashboardApi } from '.././lib/providerApi';
import { toast } from 'react-toastify';

export interface DashboardStats {
  businessName: string;
  businessType: string;
  isVerified: boolean;
  verificationStatus: string;
  stats: {
    nearbyEmergencies: number;
    activeOrders: number;
    todayFulfilled: number;
    todayDelta: number;
    weekFulfilled: number;
    monthFulfilled: number;
    totalCompleted: number;
    inventoryCylinders: number;
    stockStatus: 'healthy' | 'medium' | 'low' | 'out_of_stock';
  };
  rating: { average: number; total: number; recent: any[] };
  inventory: { type: string; quantity: number }[];
  operatingHours: { open: string; close: string };
  nearbyEmergencyPreview: NearbyRequest[];
  fetchedAt: string;
}

export interface NearbyRequest {
  id: string;
  cylinderType: 'LPG' | 'CNG';
  address: string;
  message: string | null;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  distanceKm: number;
  distanceLabel: string;
  minutesAgo: number;
  seekerName: string;
  canFulfill: boolean;
  estimatedArrivalMin?: number;
  waitingLabel?: string;
  seekerPhone?: string | null;
  quantity?: number;
  priorityScore?: number;
}

export interface TimeSeriesEntry {
  date: string;
  label: string;
  fulfilled: number;
  revenue: number;
}

export interface PerformanceMetrics {
  completedThisMonth: number;
  totalCompleted: number;
  averageRating: number;
  totalRatings: number;
  responseRate: number;
  responseRateLabel: string;
  grade: string;
  cylinderBreakdown: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

export interface ActiveOrder {
  requestId: string;
  cylinderType: string;
  quantity: number;
  seekerName: string;
  helperName: string;
  status: string;
  priorityLevel: string;
  address: string;
  orderedAt: string;
  assignedAt: string | null;
  minutesSinceAssigned: number | null;
  isOverdue: boolean;
}

export function useProviderDashboard(autoRefreshMs = 30_000) {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesEntry[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<NearbyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [dashRes, tsRes, metricsRes, ordersRes, nearbyRes] = await Promise.all([
        providerDashboardApi.getDashboard(),
        providerDashboardApi.getTimeSeries(),
        providerDashboardApi.getMetrics(),
        providerDashboardApi.getPendingOrders(),
        providerDashboardApi.getNearbyRequests(8000),
      ]);

      setDashboard(dashRes.data.data);
      setTimeSeries(tsRes.data.data?.series ?? []);
      setMetrics(metricsRes.data.data);
      setActiveOrders(ordersRes.data.data?.orders ?? []);
      setNearbyRequests(nearbyRes.data.data?.requests ?? []);
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to load dashboard';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadAll(false); }, [loadAll]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    timerRef.current = setInterval(() => loadAll(true), autoRefreshMs);
    return () => clearInterval(timerRef.current);
  }, [loadAll, autoRefreshMs]);

  const refresh = () => loadAll(false);
  const silentRefresh = () => loadAll(true);

  const updateInventory = async (updates: { type: 'LPG' | 'CNG'; quantity: number }[]) => {
    await providerDashboardApi.updateInventory(updates);
    await loadAll(true);
    toast.success('Inventory updated');
  };

  const fulfillRequest = async (requestId: string) => {
    await providerDashboardApi.fulfillDirect(requestId);
    toast.success('Request fulfilled!');
    await loadAll(true);
  };

  const markCollected = async (requestId: string) => {
    await providerDashboardApi.markCollected(requestId);
    toast.success('Marked as collected — inventory reduced');
    await loadAll(true);
  };

  return {
    dashboard, timeSeries, metrics, activeOrders, nearbyRequests,
    loading, refreshing, lastUpdated, error,
    refresh, silentRefresh, updateInventory, fulfillRequest, markCollected,
  };
}