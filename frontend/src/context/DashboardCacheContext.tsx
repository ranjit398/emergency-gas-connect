import React, { createContext, useContext, useCallback, useEffect } from 'react';

/**
 * Dashboard Data Cache Context
 * Implements caching strategy to avoid re-fetching on tab switches
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

interface DashboardCacheContextType {
  cache: Record<string, CacheEntry<any>>;
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T, ttl?: number) => void;
  invalidateCache: (key?: string) => void;
  isCached: (key: string) => boolean;
}

const DashboardCacheContext = createContext<DashboardCacheContextType | undefined>(undefined);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const ANALYTICS_TTL = 10 * 60 * 1000; // 10 minutes (slower to compute)

export function DashboardCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = React.useState<Record<string, CacheEntry<any>>>({});

  // Clean up expired entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCache((prevCache) => {
        const now = Date.now();
        const validEntries: Record<string, CacheEntry<any>> = {};

        Object.entries(prevCache).forEach(([key, entry]) => {
          if (now - entry.timestamp < entry.ttl) {
            validEntries[key] = entry;
          }
        });

        return validEntries;
      });
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const entry = cache[key];
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) return null;

    return entry.data as T;
  }, [cache]);

  const setCachedData = useCallback(<T,>(key: string, data: T, ttl = DEFAULT_TTL) => {
    setCache((prevCache) => ({
      ...prevCache,
      [key]: {
        data,
        timestamp: Date.now(),
        ttl,
      },
    }));
  }, []);

  const invalidateCache = useCallback((key?: string) => {
    setCache((prevCache) => {
      if (key) {
        const { [key]: _, ...rest } = prevCache;
        return rest;
      }
      return {};
    });
  }, []);

  const isCached = useCallback(
    (key: string): boolean => {
      const entry = cache[key];
      if (!entry) return false;
      return Date.now() - entry.timestamp < entry.ttl;
    },
    [cache]
  );

  return (
    <DashboardCacheContext.Provider
      value={{
        cache,
        getCachedData,
        setCachedData,
        invalidateCache,
        isCached,
      }}
    >
      {children}
    </DashboardCacheContext.Provider>
  );
}

export function useDashboardCache() {
  const context = useContext(DashboardCacheContext);
  if (!context) {
    throw new Error('useDashboardCache must be used within DashboardCacheProvider');
  }
  return context;
}

/**
 * Cache key generator for consistency
 */
export const cacheKeys = {
  dashboardStats: (providerId: string) => `dashboard_stats_${providerId}`,
  requests: (providerId: string, page: number, limit: number, status?: string) =>
    `requests_${providerId}_p${page}_l${limit}_${status || 'all'}`,
  helpers: (providerId: string, page: number, limit: number) =>
    `helpers_${providerId}_p${page}_l${limit}`,
  inventory: (providerId: string) => `inventory_${providerId}`,
  analytics: (providerId: string, days: number) => `analytics_${providerId}_${days}d`,
};

/**
 * Hook with built-in caching
 */
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
) {
  const { getCachedData, setCachedData, isCached } = useDashboardCache();
  const [data, setData] = React.useState<T | null>(() => getCachedData<T>(key));
  const [loading, setLoading] = React.useState(!isCached(key));
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (isCached(key)) {
      setData(getCachedData<T>(key));
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetchFn();
        if (mounted) {
          setData(result);
          setCachedData(key, result, ttl);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [key, fetchFn, ttl, getCachedData, setCachedData, isCached]);

  return { data, loading, error };
}
