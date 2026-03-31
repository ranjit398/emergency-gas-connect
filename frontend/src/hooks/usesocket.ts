import { useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';

type EventCallback = (...args: any[]) => void;

─────────────────────

export const useSocket = (events: Record<string, EventCallback>) => {
  useEffect(() => {
    const socket = getSocket();
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export const useJoinRoom = (room: string | undefined) => {
  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('join:request', room);
    return () => { socket.emit('leave:request', room); };
  }, [room]);
};

export const useEmit = () => {
  return useCallback((event: string, data?: any) => {
    const socket = getSocket();
    socket.emit(event, data);
  }, []);
};

// ── NEW: Chat room hook ───────────────────────────────────────────────────────

export const useChatRoom = (requestId: string | undefined) => {
  useEffect(() => {
    if (!requestId) return;
    const socket = getSocket();
    socket.emit('join_room', { requestId });
    return () => { socket.emit('leave_room', { requestId }); };
  }, [requestId]);
};

// ── NEW: Typing indicator hook ────────────────────────────────────────────────

export const useTypingIndicator = (requestId: string | undefined) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!requestId) return;
    const socket = getSocket();
    socket.emit('typing', { requestId, isTyping });
  }, [requestId]);

  const handleKeyPress = useCallback(() => {
    sendTyping(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  }, [sendTyping]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      sendTyping(false);
    };
  }, [sendTyping]);

  return { handleKeyPress };
};

// ── NEW: Online presence hook ─────────────────────────────────────────────────

export const useOnlineStatus = (userId: string | undefined) => {
  const isOnlineRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();

    const handleOnline  = (d: { userId: string }) => { if (d.userId === userId) isOnlineRef.current = true; };
    const handleOffline = (d: { userId: string }) => { if (d.userId === userId) isOnlineRef.current = false; };

    socket.on('user:online',  handleOnline);
    socket.on('user:offline', handleOffline);

    return () => {
      socket.off('user:online',  handleOnline);
      socket.off('user:offline', handleOffline);
    };
  }, [userId]);

  return { isOnline: isOnlineRef.current };
};

// ── NEW: Provider dashboard subscription ─────────────────────────────────────

export const useProviderSocket = (
  providerId: string | undefined,
  handlers: {
    onNewRequest?: (data: any) => void;
    onRequestUpdated?: (data: any) => void;
    onRequestCompleted?: (data: any) => void;
    onStatsUpdate?: (data: any) => void;
  }
) => {
  useEffect(() => {
    if (!providerId) return;
    const socket = getSocket();
    socket.emit('provider:subscribe', providerId);

    if (handlers.onNewRequest)       socket.on('request:new', handlers.onNewRequest);
    if (handlers.onRequestUpdated)   socket.on('request:status-changed', handlers.onRequestUpdated);
    if (handlers.onRequestCompleted) socket.on('provider:stats-update', handlers.onStatsUpdate ?? (() => {}));

    return () => {
      socket.emit('provider:unsubscribe', providerId);
      if (handlers.onNewRequest)       socket.off('request:new', handlers.onNewRequest);
      if (handlers.onRequestUpdated)   socket.off('request:status-changed', handlers.onRequestUpdated);
      if (handlers.onStatsUpdate)      socket.off('provider:stats-update', handlers.onStatsUpdate);
    };
  }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps
};