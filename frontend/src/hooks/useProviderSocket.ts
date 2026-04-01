import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Hook for provider-specific real-time Socket.io events
 * Listens for: new orders, new nearby requests, order status updates, dashboard updates
 * 
 * Usage:
 * useProviderSocket({
 *   onNewOrder: () => refetchOrders(),
 *   onNewRequest: () => refetchRequests(),
 *   onDashboardUpdate: (event) => handleUpdate(event),
 *   onInventoryUpdate: (inventory) => updateUI(inventory),
 * });
 */
export const useProviderSocket = (callbacks?: {
  onNewOrder?: () => void;
  onNewRequest?: () => void;
  onOrderStatusChange?: (orderId: string, status: string) => void;
  onDashboardUpdate?: (event: any) => void;
  onInventoryUpdate?: (inventory: any) => void;
  onStatsRefresh?: () => void;
}) => {
  useEffect(() => {
    const socket = getSocket();

    // Listen for new orders from helpers
    socket.on('provider:order:new', (data: any) => {
      console.log('[ProviderSocket] New order received', data);
      callbacks?.onNewOrder?.();
    });

    // Listen for new nearby requests
    socket.on('provider:request:nearby', (data: any) => {
      console.log('[ProviderSocket] New nearby request', data);
      callbacks?.onNewRequest?.();
    });

    // Listen for order status changes
    socket.on('provider:order:status-changed', (data: { orderId: string; status: string }) => {
      console.log('[ProviderSocket] Order status changed', data);
      callbacks?.onOrderStatusChange?.(data.orderId, data.status);
    });

    // Listen for emergency alerts (high-priority nearby requests)
    socket.on('provider:emergency:alert', (data: any) => {
      console.warn('[ProviderSocket] EMERGENCY ALERT', data);
      // Could also trigger a notification here
    });

    // ════════════════════════════════════════════════════════════════════════
    // NEW: Enhanced Dashboard Real-time Updates
    // ════════════════════════════════════════════════════════════════════════

    // Listen for general dashboard updates
    socket.on('dashboard_update', (event: any) => {
      console.log('[ProviderSocket] Dashboard update:', event);
      callbacks?.onDashboardUpdate?.(event);
    });

    // Listen for inventory changes
    socket.on('inventory_updated', (data: any) => {
      console.log('[ProviderSocket] Inventory updated:', data);
      callbacks?.onInventoryUpdate?.(data);
    });

    // Listen for stats refresh notification
    socket.on('stats_refresh', () => {
      console.log('[ProviderSocket] Stats refresh requested');
      callbacks?.onStatsRefresh?.();
    });

    // Listen for request updated events
    socket.on('request_updated', (data: any) => {
      console.log('[ProviderSocket] Request updated:', data);
      callbacks?.onDashboardUpdate?.({
        type: 'REQUEST_UPDATED',
        data,
      });
    });

    // Listen for helper status changes
    socket.on('helper_updated', (data: any) => {
      console.log('[ProviderSocket] Helper status updated:', data);
      callbacks?.onDashboardUpdate?.({
        type: 'HELPER_UPDATE',
        data,
      });
    });

    return () => {
      socket.off('provider:order:new');
      socket.off('provider:request:nearby');
      socket.off('provider:order:status-changed');
      socket.off('provider:emergency:alert');
      socket.off('dashboard_update');
      socket.off('inventory_updated');
      socket.off('stats_refresh');
      socket.off('request_updated');
      socket.off('helper_updated');
    };
  }, [callbacks]);
};

export default useProviderSocket;
