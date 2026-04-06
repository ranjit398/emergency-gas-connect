# Live Data Integration Guide

## Overview

The live data system has been enhanced to provide real-time data reflection from the MongoDB database with Socket.IO integration to push instant updates to all connected clients.

## Architecture

### Backend Components

#### 1. **LiveDataService** (`src/services/LiveDataService.ts`)
- Fetches real-time data for all roles: provider, helper, seeker
- Uses MongoDB aggregation pipelines with geospatial queries
- Gracefully falls back to non-geo queries if indexes are missing
- Returns comprehensive stats, nearby requests, ratings, messages

#### 2. **RealtimeDataSync Service** (`src/services/realtimeDataSync.service.ts`) - NEW
- Watches MongoDB change streams for updates
- Debounces data refreshes to prevent flooding
- Broadcasts live updates via Socket.IO
- Handles inventory, ratings, messages, and request changes

#### 3. **LiveDataController** (`src/controllers/LiveDataController.ts`)
- HTTP endpoints for fetching live data
- Endpoints:
  - `GET /api/v1/live/me` - Returns role-appropriate data
  - `GET /api/v1/live/provider` - Provider-specific data
  - `GET /api/v1/live/helper` - Helper-specific data
  - `GET /api/v1/live/seeker` - Seeker-specific data

#### 4. **Diagnostic Routes** (`src/routes/liveDiagnostics.ts`) - NEW
- Debug and verify live data flow
- Endpoints:
  - `GET /api/v1/diagnostics/health` - System health
  - `GET /api/v1/diagnostics/whoami` - User info
  - `GET /api/v1/diagnostics/recent-requests` - Check data freshness
  - `GET /api/v1/diagnostics/provider-test` - Provider data verification

### Frontend Components

#### 1. **useLiveData Hook** (`src/hooks/useLiveData.ts`) - UPDATED
- Universal hook for all roles
- Auto-refreshes every 60 seconds (configurable)
- Listens to Socket.IO events for instant updates:
  - `live:data-refresh` - Full data refresh
  - `live:data-changed` - Incremental changes
  - `inventory:updated` - Inventory changes
  - `dashboard_update` - Dashboard updates
  - `request:*` - Request lifecycle changes
- Debounces refresh to batch multiple events

#### 2. **useProviderDashboard Hook** (`src/hooks/useProviderDashboard.ts`)
- Provider-specific dashboard data
- Uses `/api/v1/provider/*` endpoints
- Integrates with real-time updates

## Real-Time Data Flow

### WebSocket Events

1. **Data Changes Detected** (MongoDB change streams)
   ```
   MongoDB → RealtimeDataSync Service
   ```

2. **Event Emission** (Socket.IO broadcast)
   ```
   RealtimeDataSync → Socket.IO → Connected Clients
   ```

3. **Frontend Updates**
   ```
   Socket Event → useLiveData Hook → State Update → UI Re-render
   ```

### Event Types

- `live:data-refresh` - Full dashboard refresh with all data
- `live:data-changed` - Incremental data changes (no-op, triggers refresh)
- `inventory:updated` - Real-time inventory changes
- `dashboard_update` - Provider dashboard specific updates
- `request:status-changed` - Request status updates
- `request:new` - New request created
- `message:new` - New message received
- `notification:request-accepted` - Request accepted

## How to Use

### Provider Dashboard

```tsx
import { useLiveData } from '@hooks/useLiveData';

function MyDashboard() {
  const { providerData, loading, error, newEvents, refresh } = useLiveData('provider', 60000);

  return (
    <div>
      {/* Data automatically updates from MongoDB via Socket.IO */}
      <div>Requests: {providerData?.stats.totalRequests}</div>
      <div>Nearby Pending: {providerData?.stats.nearbyPending}</div>
      <div>Stock: {providerData?.inventory}</div>
      
      {/* New events appear here */}
      <EventLog events={newEvents} />
      
      {/* Manual refresh if needed */}
      <button onClick={refresh}>Refresh Now</button>
    </div>
  );
}
```

### Backend Data Push

```typescript
import { triggerLiveDataRefresh } from '@services/realtimeDataSync.service';

// After significant data changes, trigger refresh
await triggerLiveDataRefresh(userId, 'provider');
```

## Testing Live Data

### 1. Check System Health
```bash
curl http://localhost:5000/api/v1/diagnostics/health
```

### 2. Verify Your Role
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/diagnostics/whoami
```

### 3. Check Recent Data
```bash
curl http://localhost:5000/api/v1/diagnostics/recent-requests
```

### 4. Test Provider Data
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/diagnostics/provider-test
```

### 5. Test Live Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/live/me
```

## Data Flow Debugging

### Monitor Socket.IO Events

```typescript
const socket = getSocket();

// Log all incoming events
socket.onAny((event, payload) => {
  console.log(`[Socket] ${event}:`, payload);
});
```

### Check API Response

```typescript
const response = await api.get('/live/me');
console.log('Live data:', response.data.data);
```

## Performance Optimizations

1. **Debounced Refresh** (2s delay)
   - Batches multiple socket events into single refresh
   - Prevents API overload

2. **Smart Change Streams**
   - Only watches relevant collections
   - Ignores irrelevant updates

3. **Lean Queries**
   - `.lean()` on read-only queries
   - Reduces memory footprint

4. **Geospatial Fallback**
   - Automatically falls back if indexes missing
   - Ensures system works even with incomplete setup

## Configuration

### Auto-refresh Interval
```typescript
useLiveData('provider', 120_000) // Refresh every 2 minutes
useLiveData('provider', 0)        // Disable auto-refresh
```

### Socket.IO Connection
- Polling only (WebSocket disabled for free tier compatibility)
- Ping/Pong: 25s interval, 60s timeout
- Automatic reconnection on disconnect

## Troubleshooting

### Data Not Updating

1. **Check database connection**
   ```bash
   curl http://localhost:5000/api/v1/diagnostics/health
   ```

2. **Verify Socket.IO connection**
   - Check browser DevTools → Network → WS
   - Should see `/socket.io/` requests

3. **Check real recent data**
   ```bash
   curl http://localhost:5000/api/v1/diagnostics/recent-requests
   ```

### Stale Data

1. **Increase auto-refresh frequency**
   ```typescript
   useLiveData('provider', 30_000) // Every 30s
   ```

2. **Manual refresh**
   ```typescript
   const { refresh } = useLiveData('provider');
   refresh(); // Immediate refresh
   ```

### Socket Events Not Received

1. **Check console for connection errors**
   ```typescript
   const socket = getSocket();
   socket.on('connect_error', console.error);
   ```

2. **Verify CORS and Socket.IO configuration**
   - Check server.ts socket CORS settings
   - Ensure allowed origins are correct

## API Response Format

All endpoints return:

```typescript
{
  success: true,
  data: {
    role: 'provider' | 'helper' | 'seeker',
    // Role-specific data...
    fetchedAt: string // ISO timestamp
  },
  message?: string
}
```

## Next Steps

1. **Monitor Dashboard** - Watch live updates in real-time
2. **Check Logs** - Review server logs for data flow
3. **Test Events** - Trigger changes and see instant updates
4. **Optimize** - Adjust refresh rates based on needs
5. **Deploy** - Push to production with confidence

## Notes

- Real-time sync runs automatically after server starts
- Change streams are memory-efficient (server-side)
- Frontend debounces to prevent excessive re-renders
- All data is fresh from MongoDB (no caching)
- Geospatial queries gracefully degrade if indexes missing
