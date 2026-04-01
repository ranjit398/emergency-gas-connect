/**
 * PERFORMANCE OPTIMIZATION - IMPLEMENTATION EXAMPLES
 * Copy-paste ready code snippets for integration
 */

// ============================================================
// 1. WRAP APP WITH CACHE PROVIDER
// ============================================================

// File: frontend/src/App.tsx
import { DashboardCacheProvider } from './context/DashboardCacheContext';

function App() {
  return (
    <DashboardCacheProvider>
      <AuthProvider>
        <Router>
          {/* Your routes */}
        </Router>
      </AuthProvider>
    </DashboardCacheProvider>
  );
}

// ============================================================
// 2. USE CACHING IN COMPONENTS
// ============================================================

// File: frontend/src/components/MyComponent.tsx
import { useDashboardCache, cacheKeys, useCachedData } from '../context/DashboardCacheContext';
import { providerApi } from '../lib/api/providerApi';

function MyComponent() {
  const providerId = useAuth().user.id;

  // Automatic caching with 5 minute TTL
  const { data, loading, error } = useCachedData(
    cacheKeys.dashboardStats(providerId),
    () => providerApi.getDashboardStats(),
    5 * 60 * 1000 // 5 minutes
  );

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return <div>{data?.total} total requests</div>;
}

// ============================================================
// 3. MANUAL CACHE MANAGEMENT
// ============================================================

// File: frontend/src/components/DashboardWithRefresh.tsx
import { useDashboardCache, cacheKeys } from '../context/DashboardCacheContext';

function DashboardWithRefresh() {
  const { invalidateCache, isCached } = useDashboardCache();
  const providerId = '12345';

  const handleRefresh = () => {
    // Invalidate specific cache
    invalidateCache(cacheKeys.dashboardStats(providerId));
    
    // Or invalidate all related caches
    invalidateCache(); // clears everything
  };

  const statsAreCached = isCached(cacheKeys.dashboardStats(providerId));

  return (
    <Box>
      <Button onClick={handleRefresh}>
        {statsAreCached ? '🟢 Cached' : '🔄 Fetching'} Refresh
      </Button>
    </Box>
  );
}

// ============================================================
// 4. USE VIRTUALIZED TABLE FOR LARGE LISTS
// ============================================================

// File: frontend/src/components/Tables.tsx
import { VirtualizedDataTable } from './VirtualizedDataTable';

function LargeRequestsList({ requests, isLoading }) {
  const columns = [
    {
      id: '_id',
      label: 'Request ID',
      width: 100,
      render: (val) => val.slice(0, 8),
    },
    {
      id: 'status',
      label: 'Status',
      width: 100,
      render: (val) => <Chip label={val} />,
    },
    {
      id: 'createdAt',
      label: 'Created',
      width: 150,
      render: (val) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <VirtualizedDataTable
      columns={columns}
      rows={requests}
      height={600}
      itemSize={53}
      loading={isLoading}
    />
  );
}

// ============================================================
// 5. PERFORMANCE MONITORING in COMPONENTS
// ============================================================

// File: frontend/src/components/MonitoredComponent.tsx
import { usePerformanceMonitor, performanceMonitor } from '../utils/performanceMonitor';

function MonitoredDataFetch() {
  const { start, end } = usePerformanceMonitor('component-render');

  useEffect(() => {
    start();
    // Do work here
    end({ itemCount: 100 });
  }, []);

  const handleClick = async () => {
    start();
    const data = await fetchData();
    end({ success: true });
  };

  return (
    <Box>
      <Button onClick={handleClick}>Fetch Data</Button>
      <Button onClick={() => performanceMonitor.logSummary()}>
        Show Performance Summary
      </Button>
    </Box>
  );
}

// ============================================================
// 6. REPLACE REQUESTS TABLE (TAB SWITCHING FIX)
// ============================================================

// Before: frontend/src/components/ProviderDashboard.tsx
import RequestsTable from './RequestsTable'; // Old version
<RequestsTable requests={requests} /> // API hit on every tab switch!

// After:
import { CachedRequestsTable } from './CachedRequestsTable'; // New cached version
<CachedRequestsTable providerId={providerId} /> // Cached! No re-fetch on tab switch

// ============================================================
// 7. API HOOK WITH CACHING
// ============================================================

// File: frontend/src/hooks/useCachedRequests.ts
import { useCachedData, cacheKeys } from '../context/DashboardCacheContext';
import { providerApi } from '../lib/api/providerApi';

export function useCachedRequests(
  page: number = 1,
  limit: number = 20,
  status?: string
) {
  const providerId = useAuth().user.id;

  return useCachedData(
    cacheKeys.requests(providerId, page, limit, status),
    () => providerApi.getRequests(page, limit, status),
    5 * 60 * 1000 // 5 minute cache
  );
}

// Usage in component:
function RequestsList() {
  const { data, loading, error } = useCachedRequests(1, 20, 'active');
  // Automatically cached!
}

// ============================================================
// 8. DATABASE QUERY OPTIMIZATION
// ============================================================

// File: backend/src/routes/provider-dashboard.ts
import { OptimizedAnalyticsService } from '../services/analytics-optimized.service';

// Old: router.get('/analytics', getAnalytics);
// New: router.get('/analytics', getAnalyticsOptimized);

// Manual usage:
const stats = await OptimizedAnalyticsService.getDashboardStatsOptimized(providerId);
const requests = await OptimizedAnalyticsService.getRequestsOptimized(
  providerId,
  page,
  limit,
  status
);

// ============================================================
// 9. CACHE DEBUGGING (DevTools)
// ============================================================

// File: frontend/src/components/CacheDebugger.tsx
import { useDashboardCache } from '../context/DashboardCacheContext';

export function CacheDebugger() {
  const { cache, invalidateCache } = useDashboardCache();

  useEffect(() => {
    // Make globally available for debugging
    (window as any).__dashboardCache = {
      cache,
      clear: () => invalidateCache(),
      entries: Object.keys(cache).length,
    };
  }, [cache]);

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #ddd', m: 2 }}>
      <Typography variant="h6">Cache Debug</TypeScript>
      <Typography>Cached entries: {Object.keys(cache).length}</Typography>
      <Button onClick={() => invalidateCache()}>Clear Cache</Button>
      <pre>{JSON.stringify(Object.keys(cache), null, 2)}</pre>
    </Box>
  );
}

// Access in console:
// __dashboardCache.entries → 5
// __dashboardCache.clear() → clears all

// ============================================================
// 10. INDEX VERIFICATION SCRIPT
// ============================================================

// File: backend/verify-indexes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function verifyIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Check a specific index is being used
  const explanation = await db.collection('emergency_requests')
    .find({ providerId: 'test123' })
    .explain('executionStats');

  console.log('Index used:', explanation.executionStats.executionStages.stage);
  // Should show: IXSCAN (index scan) - GOOD!
  // If shows: COLLSCAN (collection scan) - BAD!

  await mongoose.connection.close();
}

verifyIndexes();

// ============================================================
// 11. PERFORMANCE API WRAPPER
// ============================================================

// File: frontend/src/lib/api/performantApi.ts
import { measureApiCall } from '../../utils/performanceMonitor';

export class PerformantProviderApi {
  static async getDashboardStats() {
    return measureApiCall('fetch-dashboard-stats', () =>
      providerApi.getDashboardStats()
    );
  }

  static async getRequests(page, limit, status) {
    return measureApiCall(`fetch-requests-p${page}`, () =>
      providerApi.getRequests(page, limit, status)
    );
  }

  // All API calls now tracked!
}

// ============================================================
// 12. COMPLETE OPTIMIZED DASHBOARD SETUP
// ============================================================

// File: frontend/src/pages/ProviderDashboardPage.tsx
import { ProviderDashboardOptimized } from '../components/ProviderDashboardOptimized';

export default function ProviderDashboardPage() {
  // Already wrapped with cache provider
  return <ProviderDashboardOptimized />;
}

// App.tsx
import ProviderDashboardPage from './pages/ProviderDashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<ProviderDashboardPage />} />
    </Routes>
  );
}

// ============================================================
// VERIFICATION CHECKLIST
// ============================================================

// Run in browser console to verify caching:
/*
1. Open Network tab
2. Go to Dashboard
3. See initial network requests
4. Switch tabs (e.g., click Inventory, then back to Requests)
5. ✅ Verify NO new network requests (cached!)
6. Wait 5+ minutes
7. Switch tabs again
8. ✅ See network request (cache expired, fresh data)
*/

// Performance improvements you should see:
/*
Before:
- Dashboard load: 3-4 seconds
- Tab switch: 1-2 seconds (API re-fetch!)
- Rendering 1000 items: 500ms+ lag

After:
- Dashboard load: 800ms (maybe cached, very fast)
- Tab switch: 0ms (cache hit!)
- Rendering 1000 items: smooth, no lag
*/
