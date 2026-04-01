# Provider Dashboard Enhancement - Integration Guide

## 🎯 Overview

This guide integrates all the new features for the Provider Dashboard:
- Dynamic request tracking
- Helper monitoring
- Inventory management (LPG & CNG stock)
- Real-time Socket.io updates
- Phone number support for providers

## 📋 What Was Implemented

### 1. **Backend Changes**

#### Database Schema Updates
- `Provider` model now includes:
  - `phone: string` - Provider's contact phone
  - `lpgStock: number` - LPG cylinder inventory
  - `cngStock: number` - CNG cylinder inventory

#### New API Endpoints
```
GET  /api/v1/provider-dashboard/dashboard-stats
GET  /api/v1/provider-dashboard/requests?page=1&limit=20&status=pending
GET  /api/v1/provider-dashboard/helpers?page=1&limit=20
GET  /api/v1/provider-dashboard/inventory
PUT  /api/v1/provider-dashboard/inventory-stock
GET  /api/v1/provider-dashboard/analytics-data
```

#### New Services
- `src/services/providerDashboard.service.ts` - Core business logic for:
  - Dashboard statistics
  - Request tracking
  - Helper monitoring
  - Inventory management
  - Analytics

#### Socket Events
```javascript
// Emitted FROM backend TO frontend
'dashboard_update'      // General dashboard updates
'inventory_updated'     // Inventory stock changes
'stats_refresh'        // Request stats refresh
'request_updated'      // Individual request status
'helper_updated'       // Helper availability changes

// Listened FROM frontend TO backend
'dashboard:refresh'    // Request stats refresh
```

### 2. **Frontend Changes**

#### New Components
- `ProviderStats.tsx` - Displays key statistics cards
- `InventoryCard.tsx` - Inventory display and update form

#### Enhanced Hooks
- `useProviderSocket.ts` - Socket listeners for real-time updates

#### Updated Pages
- `Signup.tsx` - Added phone field (required for providers)

---

## 🚀 Step-by-Step Integration

### **Step 1: Verify Backend Changes**

1. Check Provider schema has new fields:
```typescript
phone?: string
lpgStock: number      // default: 0
cngStock: number      // default: 0
```

2. Verify new routes exist in `backend/src/routes/provider-dashboard.ts`

3. Confirm service methods are available in `backend/src/services/providerDashboard.service.ts`

### **Step 2: Frontend API Integration**

Ensure your API client (/frontend/src/lib/api.ts or /frontend/src/lib/providerApi.ts) includes:

```typescript
export const providerDashboardApi = {
  // Stats
  getDashboardStats: () => 
    api.get('/provider-dashboard/dashboard-stats'),
  
  // Requests
  getRequests: (page = 1, limit = 20, status?: string) =>
    api.get('/provider-dashboard/requests', { params: { page, limit, status } }),
  
  // Helpers
  getHelpers: (page = 1, limit = 20) =>
    api.get('/provider-dashboard/helpers', { params: { page, limit } }),
  
  // Inventory
  getInventory: () =>
    api.get('/provider-dashboard/inventory'),
  
  updateInventory: (lpgStock: number, cngStock: number) =>
    api.put('/provider-dashboard/inventory-stock', { lpgStock, cngStock }),
  
  // Analytics
  getAnalytics: () =>
    api.get('/provider-dashboard/analytics-data'),
};
```

### **Step 3: Update Provider Dashboard Page**

In `/frontend/src/pages/ProviderDashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import ProviderStats from '../components/ProviderStats';
import InventoryCard from '../components/InventoryCard';
import { useProviderSocket } from '../hooks/useProviderSocket';
import { providerDashboardApi } from '../lib/providerApi';

export default function ProviderDashboard() {
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  const loadData = async () => {
    try {
      const [statsRes, inventoryRes] = await Promise.all([
        providerDashboardApi.getDashboardStats(),
        providerDashboardApi.getInventory(),
      ]);
      setStats(statsRes.data.data);
      setInventory(inventoryRes.data.data);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Socket real-time updates
  useProviderSocket({
    onDashboardUpdate: (event) => {
      console.log('Dashboard updated:', event);
      loadData(); // Refresh on updates
    },
    onInventoryUpdate: (inventory) => {
      setInventory(inventory);
    },
    onStatsRefresh: () => {
      loadData();
    },
  });

  return (
    <div>
      <ProviderStats 
        stats={stats} 
        isLoading={loading}
        onRefresh={loadData}
      />
      
      <InventoryCard
        inventory={inventory}
        isLoading={loading}
        onUpdate={(lpg, cng) => providerDashboardApi.updateInventory(lpg, cng)}
      />
    </div>
  );
}
```

### **Step 4: Socket Connection Setup**

Ensure Socket.io is properly configured in your frontend:

```typescript
// frontend/src/lib/socket.ts
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
});

socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('dashboard_update', (data) => {
  console.log('Dashboard update received:', data);
});

export const getSocket = () => socket;
```

### **Step 5: Backend Socket Event Emission**

When a request is completed or inventory is updated, emit events from your controllers/services:

```typescript
// In EmergencyRequestService or similar
import { emitDashboardUpdate, emitInventoryUpdate } from '@socket/dashboard.handler';

// When request completed
await request.save();
emitDashboardUpdate(io, {
  type: 'REQUEST_COMPLETED',
  providerId: request.providerId.toString(),
  requestId: request._id.toString(),
  status: 'completed',
});

// When inventory updated
await provider.save();
emitInventoryUpdate(io, provider._id.toString(), {
  lpgStock: provider.lpgStock,
  cngStock: provider.cngStock,
});
```

### **Step 6: Test Phone Field in Signup**

1. Go to signup page
2. Select "Gas Provider/Agency" role
3. Phone field should appear and be **required**
4. For other roles, phone should be optional
5. Verify phone validation (minimum 10 digits)

---

## 🔌 Real-Time Socket Events

### **Frontend Listeners (useProviderSocket hook)**

```typescript
// Dashboard update
socket.on('dashboard_update', (event) => {
  // event.type: 'REQUEST_UPDATED', 'REQUEST_COMPLETED', 'INVENTORY_UPDATED'
  // event.data: relevant data
  // event.timestamp: ISO timestamp
});

// Inventory update
socket.on('inventory_updated', (data) => {
  // data.lpgStock, data.cngStock, data.totalStock
});

// Stats refresh request
socket.on('stats_refresh', () => {
  // Refetch dashboard stats
});
```

### **Backend Emitters (dashboard.handler.ts)**

```typescript
// Emit to all providers
emitDashboardUpdate(io, {
  type: 'REQUEST_COMPLETED',
  providerId: providerId,
  requestId: requestId,
  data: { status: 'completed' }
});

// Emit inventory change
emitInventoryUpdate(io, providerId, { lpgStock, cngStock });

// Request stats refresh
emitStatsRefresh(io, providerId);
```

---

## 📊 API Response Formats

### Dashboard Stats
```json
{
  "success": true,
  "data": {
    "totalRequests": 150,
    "completedRequests": 120,
    "pendingRequests": 15,
    "activeRequests": 5,
    "activeHelpers": 8,
    "successRate": 80,
    "averageRating": 4.5,
    "totalRatings": 95,
    "businessName": "GasConnect Agency",
    "businessType": "Both",
    "isVerified": true,
    "fetchedAt": "2024-04-01T10:30:00Z"
  }
}
```

### Inventory
```json
{
  "success": true,
  "data": {
    "lpgStock": 45,
    "cngStock": 28,
    "totalStock": 73,
    "businessType": "Both",
    "lastUpdated": "2024-04-01T09:15:00Z"
  }
}
```

### Requests
```json
{
  "success": true,
  "data": [
    {
      "requestId": "req_123",
      "cylinderType": "LPG",
      "status": "completed",
      "quantity": 1,
      "address": "123 Main St",
      "seekerEmail": "seeker@example.com",
      "helperName": "John Doe",
      "helperRating": 4.8,
      "createdAt": "2024-04-01T08:00:00Z",
      "completedAt": "2024-04-01T08:30:00Z",
      "priority": "high"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Verify all 6 new API endpoints return correct data
- [ ] Test pagination in requests and helpers endpoints
- [ ] Verify inventory stock validation (no negative values)
- [ ] Test socket events emit when requests are updated
- [ ] Confirm phone field is saved for providers

### Frontend Tests
- [ ] Phone field appears for provider signup
- [ ] Phone validation works (min 10 digits)
- [ ] ProviderStats component displays data correctly
- [ ] InventoryCard shows LPG and CNG stock
- [ ] Inventory update dialog works and calls API
- [ ] Real-time updates work via Socket.io
- [ ] Dashboard refreshes when socket events received

### Integration Tests
- [ ] Create provider account with phone number
- [ ] Verify phone is saved in database
- [ ] Check provider dashboard loads stats
- [ ] Update inventory through UI
- [ ] Verify socket listeners receive updates
- [ ] Confirm UI updates without page refresh

---

## 🐛 Troubleshooting

### Issue: Phone field not showing in signup
**Solution:** Ensure the Signup.tsx file has the conditional rendering for phone field based on role selection.

### Issue: "Insufficient LPG stock" error
**Solution:** This error is intentional validation. Update inventory through the inventory card before marking request complete.

### Issue: Real-time updates not working
**Solution:** 
1. Check Socket.io connection in browser DevTools
2. Verify token is being sent in socket auth
3. Confirm backend socket handlers are registered
4. Check browser console for socket errors

### Issue: Analytics showing old data
**Solution:** 
1. Try clicking refresh button on stats card
2. Check database for correct document structure
3. Verify date filters in getAnalytics method

---

## 📚 File References

### Backend Files Modified
- `src/models/Provider.ts` - Schema updates
- `src/services/providerDashboard.service.ts` - NEW
- `src/controllers/ProviderDashboardController.ts` - Enhanced
- `src/routes/provider-dashboard.ts` - New endpoints
- `src/socket/dashboard.handler.ts` - Enhanced
- `src/socket/handlers.ts` - Register dashboard handlers

### Frontend Files Modified
- `src/pages/Signup.tsx` - Phone field added
- `src/pages/ProviderDashboard.tsx` - Use new components
- `src/components/ProviderStats.tsx` - NEW
- `src/components/InventoryCard.tsx` - NEW
- `src/hooks/useProviderSocket.ts` - Enhanced

---

## 🎓 Next Steps

1. **Production Deployment**
   - Test on staging environment
   - Monitor database performance
   - Set up alerts for inventory depletion

2. **Enhanced Features**
   - Add SMS notifications for low inventory
   - Implement helper performance analytics
   - Add revenue tracking
   - Create custom dashboard reports

3. **Mobile App**
   - Adapt components for React Native
   - Add push notifications for inventory alerts
   - Implement offline inventory management

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify API response format matches documentation

---

**Last Updated:** April 1, 2024
**Version:** 1.0
