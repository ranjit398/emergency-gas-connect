import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Hook for provider-specific real-time Socket.io events
 * Listens for: new orders, new nearby requests, order status updates, dashboard updates
 * 
 * Usage:
 * useProviderSocket({
 *   providerId: 'provider-id-from-context',
 *   onNewOrder: () => refetchOrders(),
 *   onNewRequest: () => refetchRequests(),
 *   onDashboardUpdate: (event) => handleUpdate(event),
 *   onInventoryUpdate: (inventory) => updateUI(inventory),
 * });
 */
export const useProviderSocket = (callbacks?: {
  providerId?: string;
  onNewOrder?: () => void;
  onNewRequest?: () => void;
  onOrderStatusChange?: (orderId: string, status: string) => void;
  onDashboardUpdate?: (event: any) => void;
  onInventoryUpdate?: (inventory: any) => void;
  onStatsRefresh?: () => void;
}) => {
  useEffect(() => {
    const socket = getSocket();

    // Subscribe to provider-specific events if providerId is available
    if (callbacks?.providerId) {
      console.log('[ProviderSocket] Subscribing to provider room:', callbacks.providerId);
      socket.emit('provider:subscribe', callbacks.providerId);
    }

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

    // Listen for general dashboard updates (for provider:${providerId} room)
    socket.on('dashboard:update', (event: any) => {
      console.log('[ProviderSocket] Dashboard update:', event);
      callbacks?.onDashboardUpdate?.(event);
    });

    // Listen for inventory changes
    socket.on('inventory:updated', (data: any) => {
      console.log('[ProviderSocket] Inventory updated:', data);
      callbacks?.onInventoryUpdate?.(data);
    });

    // Listen for stats refresh notification
    socket.on('stats:refresh', () => {
      console.log('[ProviderSocket] Stats refresh requested');
      callbacks?.onStatsRefresh?.();
    });

    // Listen for request updated events  
    socket.on('request:updated', (data: any) => {
      console.log('[ProviderSocket] Request updated:', data);
      callbacks?.onDashboardUpdate?.({
        type: 'REQUEST_UPDATED',
        data,
      });
    });

    // Listen for helper status changes
    socket.on('helper:updated', (data: any) => {
      console.log('[ProviderSocket] Helper status updated:', data);
      callbacks?.onDashboardUpdate?.({
        type: 'HELPER_UPDATE',
        data,
      });
    });

    // Listen for new requests assigned to provider
    socket.on('request:new', (data: any) => {
      console.log('[ProviderSocket] New request received:', data);
      callbacks?.onDashboardUpdate?.({
        type: 'NEW_REQUEST',
        data,
      });
    });

    return () => {
      socket.off('provider:order:new');
      socket.off('provider:request:nearby');
      socket.off('provider:order:status-changed');
      socket.off('provider:emergency:alert');
      socket.off('dashboard:update');
      socket.off('inventory:updated');
      socket.off('stats:refresh');
      socket.off('request:updated');
      socket.off('helper:updated');
      socket.off('request:new');
    };
  }, [callbacks]);
};

export default useProviderSocket;
