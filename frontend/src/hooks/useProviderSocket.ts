import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Hook for provider-specific real-time Socket.io events.
 *
 * Key fixes vs original:
 * - Uses a ref for callbacks so the effect never re-runs due to callback identity changes
 * - Guards provider:subscribe behind socket.connected / 'connect' event
 * - Cleans up the 'connect' listener on unmount to prevent ghost listeners
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
  // ✅ Keep callbacks in a ref so the effect only runs once per providerId change
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const providerId = callbacks?.providerId;

  useEffect(() => {
    if (!providerId) return;

    const socket = getSocket();

    // ✅ Join the provider room only once the socket is confirmed connected.
    // Emitting before connect is a no-op — the original code hit this every time.
    const joinRoom = () => {
      console.log('[ProviderSocket] Subscribing to provider room:', providerId);
      socket.emit('provider:subscribe', providerId);
    };

    if (socket.connected) {
      joinRoom();
    } else {
      // Wait for the upcoming connect event — once only
      socket.once('connect', joinRoom);
    }

    // ── Event handlers (all read from the ref so they're always fresh) ────

    const onNewOrder = (data: any) => {
      console.log('[ProviderSocket] New order received', data);
      cbRef.current?.onNewOrder?.();
    };

    const onNewRequest = (data: any) => {
      console.log('[ProviderSocket] New nearby request', data);
      cbRef.current?.onNewRequest?.();
    };

    const onOrderStatusChanged = (data: { orderId: string; status: string }) => {
      console.log('[ProviderSocket] Order status changed', data);
      cbRef.current?.onOrderStatusChange?.(data.orderId, data.status);
    };

    const onEmergencyAlert = (data: any) => {
      console.warn('[ProviderSocket] EMERGENCY ALERT', data);
    };

    const onDashboardUpdate = (event: any) => {
      console.log('[ProviderSocket] Dashboard update:', event);
      cbRef.current?.onDashboardUpdate?.(event);
    };

    const onInventoryUpdated = (data: any) => {
      console.log('[ProviderSocket] Inventory updated:', data);
      cbRef.current?.onInventoryUpdate?.(data);
    };

    const onStatsRefresh = () => {
      console.log('[ProviderSocket] Stats refresh requested');
      cbRef.current?.onStatsRefresh?.();
    };

    const onRequestUpdated = (data: any) => {
      console.log('[ProviderSocket] Request updated:', data);
      cbRef.current?.onDashboardUpdate?.({ type: 'REQUEST_UPDATED', data });
    };

    const onHelperUpdated = (data: any) => {
      console.log('[ProviderSocket] Helper status updated:', data);
      cbRef.current?.onDashboardUpdate?.({ type: 'HELPER_UPDATE', data });
    };

    const onRequestNew = (data: any) => {
      console.log('[ProviderSocket] New request received:', data);
      cbRef.current?.onDashboardUpdate?.({ type: 'NEW_REQUEST', data });
    };

    // Register all listeners
    socket.on('provider:order:new',           onNewOrder);
    socket.on('provider:request:nearby',      onNewRequest);
    socket.on('provider:order:status-changed',onOrderStatusChanged);
    socket.on('provider:emergency:alert',     onEmergencyAlert);
    socket.on('dashboard:update',             onDashboardUpdate);
    socket.on('inventory:updated',            onInventoryUpdated);
    socket.on('stats:refresh',                onStatsRefresh);
    socket.on('request:updated',              onRequestUpdated);
    socket.on('helper:updated',               onHelperUpdated);
    socket.on('request:new',                  onRequestNew);

    return () => {
      // ✅ Remove the pending connect listener if we never connected
      socket.off('connect', joinRoom);

      socket.off('provider:order:new',           onNewOrder);
      socket.off('provider:request:nearby',      onNewRequest);
      socket.off('provider:order:status-changed',onOrderStatusChanged);
      socket.off('provider:emergency:alert',     onEmergencyAlert);
      socket.off('dashboard:update',             onDashboardUpdate);
      socket.off('inventory:updated',            onInventoryUpdated);
      socket.off('stats:refresh',                onStatsRefresh);
      socket.off('request:updated',              onRequestUpdated);
      socket.off('helper:updated',               onHelperUpdated);
      socket.off('request:new',                  onRequestNew);

      // Leave the room on cleanup
      if (socket.connected) {
        socket.emit('provider:unsubscribe', providerId);
      }
    };
  }, [providerId]); // ✅ Only re-run when providerId changes — not on every callback re-render
};

export default useProviderSocket;