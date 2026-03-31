// frontend/src/lib/providerApi.ts
// Drop into: frontend/src/lib/providerApi.ts
// Add these exports to your existing api.ts OR import from here

import api from './api';

export const providerDashboardApi = {
  getDashboard:   () => api.get('/provider-dashboard'),
  getTimeSeries:  () => api.get('/provider-dashboard/time-series'),
  getPendingOrders: () => api.get('/provider-dashboard/orders/pending'),
  getNearbyRequests: (maxDistance = 5000) =>
    api.get('/provider-dashboard/nearby-requests', { params: { maxDistance } }),
  getMetrics:     () => api.get('/provider-dashboard/metrics'),
  updateInventory: (updates: { type: 'LPG' | 'CNG'; quantity: number }[]) =>
    api.put('/provider-dashboard/inventory', { updates }),
  markReady:      (requestId: string) =>
    api.post(`/provider-dashboard/orders/${requestId}/ready`),
  markCollected:  (requestId: string) =>
    api.post(`/provider-dashboard/orders/${requestId}/collected`),
  fulfillDirect:  (requestId: string) =>
    api.post(`/provider-dashboard/fulfill/${requestId}`),
};