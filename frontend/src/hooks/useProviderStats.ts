// frontend/src/hooks/useProviderStats.ts
// Custom hook for real-time provider dashboard stats with Socket.IO
// Fetches initial data and listens for real-time updates

import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { getSocket } from '../lib/socket';

export interface DashboardStats {
  // Counts
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cancelledRequests?: number;
  nearbyRequests?: number;
  todayCompleted?: number;
  monthCompleted?: number;

  // Performance
  responseRate?: number;
  responseRateLabel?: string;
  averageRating?: number;
  totalRatings?: number;
  ratingDistribution?: Record<number, number>;

  // Inventory
  inventory?: any[];
  totalStock?: number;

  // Provider info
  businessName?: string;
  businessType?: string;
  isVerified?: boolean;

  // Charts
  sevenDaySeries?: Array<{
    date: string;
    label: string;
    fulfilled: number;
    revenue?: number;
  }>;

  // Recent activity
  recentActivity?: Array<any>;

  fetchedAt?: string;
}

export interface UseProviderStatsProps {
  providerId?: string;
  enabled?: boolean;
  refreshInterval?: number; // ms between auto-refresh
  onStatsChange?: (stats: DashboardStats) => void;
}

/**
 * Hook for real-time provider dashboard stats
 * - Fetches initial data on mount
 * - Listens to Socket.IO dashboard updates
 * - Auto-refetches on interval if specified
 * - Returns stats and loading/error states
 */
export const useProviderStats = ({
  providerId,
  enabled = true,
  refreshInterval = 0,
  onStatsChange,
}: UseProviderStatsProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    if (!enabled) return;

    try {
      setError(null);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/provider-dashboard/stats`
      );

      if (response.data?.data) {
        setStats(response.data.data);
        setLoading(false);
        onStatsChange?.(response.data.data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch stats';
      setError(errorMsg);
      console.error('[useProviderStats] Fetch error:', err);
      setLoading(false);
    }
  }, [enabled, onStatsChange]);

  // Setup Socket.IO listeners
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    if (!socket) return;

    // Listen for dashboard updates
    const handleDashboardUpdate = (data: any) => {
      console.log('[useProviderStats] Dashboard update:', data);

      setStats((prevStats) => {
        if (!prevStats) return prevStats;

        const updated = { ...prevStats };

        // Update counts based on event type
        if (data.type === 'REQUEST_CREATED') {
          updated.totalRequests = (updated.totalRequests || 0) + 1;
          updated.activeRequests = (updated.activeRequests || 0) + 1;
        } else if (data.type === 'REQUEST_ACCEPTED') {
          updated.activeRequests = Math.max(0, (updated.activeRequests || 0) - 1);
          // activeRequests shown as accepted requests
        } else if (data.type === 'REQUEST_COMPLETED') {
          updated.completedRequests = (updated.completedRequests || 0) + 1;
          updated.activeRequests = Math.max(0, (updated.activeRequests || 0) - 1);
          if (updated.sevenDaySeries?.length) {
            // Update today's count in the series
            const today = updated.sevenDaySeries[updated.sevenDaySeries.length - 1];
            if (today) {
              today.fulfilled = (today.fulfilled || 0) + 1;
              today.revenue = (today.revenue || 0) + 850; // Assume ₹850 per delivery
            }
          }
        } else if (data.type === 'REQUEST_CANCELLED') {
          updated.cancelledRequests = (updated.cancelledRequests || 0) + 1;
          updated.activeRequests = Math.max(0, (updated.activeRequests || 0) - 1);
        }

        // Recalculate response rate
        if (updated.completedRequests !== undefined && updated.cancelledRequests !== undefined) {
          const total = updated.completedRequests + updated.cancelledRequests;
          if (total > 0) {
            const rate = Math.round((updated.completedRequests / total) * 100);
            updated.responseRate = rate;
            updated.responseRateLabel = `${rate}%`;
          }
        }

        // Update timestamp
        updated.fetchedAt = new Date().toISOString();

        return updated;
      });

      onStatsChange?.(stats);
    };

    const handleRequestUpdate = (data: any) => {
      console.log('[useProviderStats] Request update:', data);
      // Trigger refetch on significant updates
      if (data.status === 'completed' || data.status === 'cancelled') {
        fetchStats();
      }
    };

    const handleHelperUpdate = (data: any) => {
      console.log('[useProviderStats] Helper update:', data);
      // Helper availability changes
      fetchStats();
    };

    // Register listeners
    socket.on('dashboard_update', handleDashboardUpdate);
    socket.on('request_updated', handleRequestUpdate);
    socket.on('helper_updated', handleHelperUpdate);

    // Also listen to request-specific events that might indicate updates
    socket.on('REQUEST_ACCEPTED', () => {
      handleDashboardUpdate({ type: 'REQUEST_ACCEPTED' });
    });

    socket.on('REQUEST_COMPLETED', () => {
      handleDashboardUpdate({ type: 'REQUEST_COMPLETED' });
    });

    socket.on('REQUEST_CANCELLED', () => {
      handleDashboardUpdate({ type: 'REQUEST_CANCELLED' });
    });

    // Cleanup
    return () => {
      socket.off('dashboard_update', handleDashboardUpdate);
      socket.off('request_updated', handleRequestUpdate);
      socket.off('helper_updated', handleHelperUpdate);
      socket.off('REQUEST_ACCEPTED');
      socket.off('REQUEST_COMPLETED');
      socket.off('REQUEST_CANCELLED');
    };
  }, [enabled, onStatsChange, fetchStats]);

  // Auto-refresh on interval if specified
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    fetchStats(); // Initial fetch

    refreshTimerRef.current = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [enabled, refreshInterval, fetchStats]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    isRealtime: true,
  };
};

export default useProviderStats;
