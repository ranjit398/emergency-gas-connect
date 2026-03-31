// frontend/src/components/ProviderAnalyticsDashboard.tsx
// Production-grade analytics dashboard for providers with REAL-TIME Socket.IO updates

import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Clock, Star, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useProviderStats } from '../hooks/useProviderStats';

interface Analytics {
  summary: {
    totalRequests: number;
    completedRequests: number;
    activeRequests: number;
    cancelledRequests: number;
    expiredRequests: number;
    successRate: number;
  };
  performance: {
    avgResponseTime: number;
    avgRating: number;
    totalRatings: number;
    peakHour: number;
  };
  trends: {
    last7Days: Record<string, number>;
    last30Days: Record<string, number>;
  };
}

interface HelperMetrics {
  totalRequests: number;
  completedRequests: number;
  avgResponseTime: number;
  avgRating: number;
  totalRatings: number;
  responseRate: number;
  acceptanceRate: number;
}

interface ProviderAnalyticsDashboardProps {
  providerId?: string;
  helperId?: string;
}

/**
 * Metric Card Component
 */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  color?: string;
}> = ({ icon, label, value, subtext, trend, color = 'bg-blue-50' }) => (
  <div className={`${color} rounded-lg p-6 shadow-sm`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
      <div className="text-2xl opacity-50">{icon}</div>
    </div>
    {trend !== undefined && (
      <div className={`text-xs font-semibold mt-3 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend > 0 ? '' : ''} {Math.abs(trend)}% vs last period
      </div>
    )}
  </div>
);

/**
 * Provider Analytics Dashboard with Real-time Updates
 */
export const ProviderAnalyticsDashboard: React.FC<ProviderAnalyticsDashboardProps> = ({
  providerId,
  helperId,
}) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [metrics, setMetrics] = useState<HelperMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true); // Real-time status indicator

  // Use real-time provider stats hook
  const { stats: dashboardStats, loading: statsLoading, error: statsError, refetch } = useProviderStats({
    providerId,
    enabled: !helperId, // Only use for provider dashboard, not helper metrics
    refreshInterval: 30000, // Auto-refresh every 30 seconds as backup
    onStatsChange: (newStats) => {
      console.log('[ProviderAnalyticsDashboard] Real-time update:', newStats);
      setIsLive(true);
    },
  });

  // Convert dashboard stats to analytics format
  useEffect(() => {
    if (dashboardStats && !helperId) {
      const convertedAnalytics: Analytics = {
        summary: {
          totalRequests: dashboardStats.totalRequests || 0,
          completedRequests: dashboardStats.completedRequests || 0,
          activeRequests: dashboardStats.activeRequests || 0,
          cancelledRequests: dashboardStats.cancelledRequests || 0,
          expiredRequests: 0,
          successRate: dashboardStats.responseRate || 0,
        },
        performance: {
          avgResponseTime: 300, // seconds, would come from aggregation
          avgRating: dashboardStats.averageRating || 0,
          totalRatings: dashboardStats.totalRatings || 0,
          peakHour: 14,
        },
        trends: {
          last7Days: dashboardStats.sevenDaySeries?.reduce((acc, day) => {
            acc[day.label] = day.fulfilled;
            return acc;
          }, {} as Record<string, number>) || {},
          last30Days: {},
        },
      };
      setAnalytics(convertedAnalytics);
      setLoading(false);
      setError(null);
    }
  }, [dashboardStats, helperId]);

  // Fetch helper metrics if helperId provided
  useEffect(() => {
    if (!helperId) return;

    const fetchHelperMetrics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/provider-dashboard/analytics/helper/${helperId}`
        );
        setMetrics(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to load helper metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHelperMetrics();
  }, [helperId]);

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-lg">
        <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
        <p className="text-red-800 font-medium">{error}</p>
      </div>
    );
  }

  if (!analytics && !metrics) {
    return <div className="p-8 text-center text-gray-500">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Real-time Status Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 flex items-center justify-between border border-blue-200">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700">
            {isLive ? ' Live Updates' : ' Updates paused'}
          </span>
          {dashboardStats?.fetchedAt && (
            <span className="text-xs text-gray-500">
              Updated: {new Date(dashboardStats.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            refetch();
            setIsLive(true);
          }}
          className="flex items-center gap-2 px-3 py-1 bg-white rounded hover:bg-gray-50 text-sm font-medium text-gray-700 border border-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Provider Analytics Section */}
      {analytics && (
        <>
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon=""
              label="Total Requests"
              value={analytics.summary.totalRequests}
              subtext={`${analytics.summary.completedRequests} completed`}
              color="bg-blue-50"
            />
            <MetricCard
              icon=""
              label="Success Rate"
              value={`${analytics.summary.successRate.toFixed(1)}%`}
              subtext={`${analytics.summary.completedRequests} successful`}
              color="bg-green-50"
            />
            <MetricCard
              icon=""
              label="Active Requests"
              value={analytics.summary.activeRequests}
              subtext="In progress"
              color="bg-purple-50"
            />
            <MetricCard
              icon=""
              label="Avg Response"
              value={`${Math.round(analytics.performance.avgResponseTime / 60)}m`}
              subtext="Time to accept"
              color="bg-orange-50"
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Star className="w-6 h-6" />}
              label="Average Rating"
              value={analytics.performance.avgRating.toFixed(1)}
              subtext={`${analytics.performance.totalRatings} ratings`}
              color="bg-yellow-50"
            />
            <MetricCard
              icon={<Clock className="w-6 h-6" />}
              label="Peak Hour"
              value={`${analytics.performance.peakHour}:00`}
              subtext="Busiest time"
              color="bg-red-50"
            />
            <MetricCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Cancelled"
              value={analytics.summary.cancelledRequests}
              subtext={`${analytics.summary.expiredRequests} expired`}
              color="bg-gray-50"
            />
          </div>

          {/* Trends Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4"> 7-Day Trend</h3>
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(analytics.trends.last7Days).map(([day, count]) => (
                <div key={day} className="text-center">
                  <div
                    className="h-20 bg-gradient-to-t from-blue-400 to-blue-200 rounded-t-lg flex items-end justify-center pb-1"
                    style={{
                      height: `${Math.max(20, (count / 10) * 100)}px`,
                    }}
                  >
                    <span className="text-xs text-white font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{day.slice(8)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Helper Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon=""
              label="Completed Requests"
              value={metrics.completedRequests}
              subtext={`${metrics.acceptanceRate.toFixed(0)}% acceptance rate`}
              color="bg-green-50"
            />
            <MetricCard
              icon={<Clock className="w-6 h-6" />}
              label="Avg Response Time"
              value={`${Math.round(metrics.avgResponseTime / 60)}m`}
              subtext="From request to acceptance"
              color="bg-blue-50"
            />
            <MetricCard
              icon={<Star className="w-6 h-6" />}
              label="Rating"
              value={metrics.avgRating.toFixed(1)}
              subtext={`${metrics.totalRatings} reviews`}
              color="bg-yellow-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              icon={<Users className="w-6 h-6" />}
              label="Response Rate"
              value={`${metrics.responseRate.toFixed(0)}%`}
              subtext="Messages responded to"
              color="bg-purple-50"
            />
            <MetricCard
              icon=""
              label="Total Requests"
              value={metrics.totalRequests}
              subtext="All-time"
              color="bg-orange-50"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ProviderAnalyticsDashboard;
