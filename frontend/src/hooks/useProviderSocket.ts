import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Hook for provider-specific real-time Socket.io events
 * Listens for: new orders, new nearby requests, order status updates
 * 
 * Usage:
 * useProviderSocket({
 *   onNewOrder: () => refetchOrders(),
 *   onNewRequest: () => refetchRequests(),
 * });
 */
export const useProviderSocket = (callbacks?: {
  onNewOrder?: () => void;
  onNewRequest?: () => void;
  onOrderStatusChange?: (orderId: string, status: string) => void;
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

    return () => {
      socket.off('provider:order:new');
      socket.off('provider:request:nearby');
      socket.off('provider:order:status-changed');
      socket.off('provider:emergency:alert');
    };
  }, [callbacks]);
};

export default useProviderSocket;
