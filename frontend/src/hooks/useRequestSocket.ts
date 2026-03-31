// frontend/src/hooks/useRequestSocket.ts
// Production-grade Socket.IO hook for real-time request updates

import { useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { RequestNotifications } from '../components/NotificationToast';

export interface RequestUpdate {
  requestId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  helperId?: string;
  helperName?: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface UseRequestSocketProps {
  requestId: string;
  enabled?: boolean;
  onStatusChange?: (update: RequestUpdate) => void;
  onMessage?: (data: any) => void;
}

/**
 * Custom hook for Socket.IO request real-time updates
 * Automatically handles all request lifecycle events
 */
export const useRequestSocket = ({
  requestId,
  enabled = true,
  onStatusChange,
  onMessage,
}: UseRequestSocketProps) => {
  // Join request room on mount
  useEffect(() => {
    if (!requestId || !enabled) return;

    const socket = getSocket();
    socket.emit('join:request', requestId);

    return () => {
      socket.emit('leave:request', requestId);
    };
  }, [requestId, enabled]);

  // Request accepted event
  const handleRequestAccepted = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'accepted',
        helperId: data.helperId,
        helperName: data.helperName,
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.accepted(
        data.helperName || 'Helper',
        data.estimatedArrivalMin
      );
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // Request in progress event
  const handleRequestInProgress = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'in_progress',
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.inProgress(data.helperName || 'Helper');
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // Request completed event
  const handleRequestCompleted = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'completed',
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.completed(data.helperName || 'Helper');
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // Request cancelled event
  const handleRequestCancelled = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.cancelled();
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // Request reassigned event
  const handleRequestReassigned = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'pending',
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.reassigned(data.reassignmentCount || 1);
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // Request auto-expired event
  const handleRequestAutoExpired = useCallback(
    (data: any) => {
      const update: RequestUpdate = {
        requestId: data.requestId,
        status: 'expired',
        timestamp: new Date().toISOString(),
        data,
      };

      RequestNotifications.autoExpired();
      onStatusChange?.(update);
    },
    [onStatusChange]
  );

  // New message event
  const handleNewMessage = useCallback(
    (data: any) => {
      RequestNotifications.message(
        data.senderName || 'User',
        data.content?.substring(0, 50) || 'Sent a message'
      );
      onMessage?.(data);
    },
    [onMessage]
  );

  // Register all listeners
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    socket.on('request:accepted', handleRequestAccepted);
    socket.on('request:in_progress', handleRequestInProgress);
    socket.on('request:completed', handleRequestCompleted);
    socket.on('request:cancelled', handleRequestCancelled);
    socket.on('request:reassigned', handleRequestReassigned);
    socket.on('requests:auto_expired', handleRequestAutoExpired);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('request:accepted', handleRequestAccepted);
      socket.off('request:in_progress', handleRequestInProgress);
      socket.off('request:completed', handleRequestCompleted);
      socket.off('request:cancelled', handleRequestCancelled);
      socket.off('request:reassigned', handleRequestReassigned);
      socket.off('requests:auto_expired', handleRequestAutoExpired);
      socket.off('message:new', handleNewMessage);
    };
  }, [
    enabled,
    handleRequestAccepted,
    handleRequestInProgress,
    handleRequestCompleted,
    handleRequestCancelled,
    handleRequestReassigned,
    handleRequestAutoExpired,
    handleNewMessage,
  ]);
};

export default useRequestSocket;
