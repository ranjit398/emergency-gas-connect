import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

// Connect to backend - in dev use localhost:5002, production will use same host
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:5002' : `${window.location.protocol}//${window.location.hostname}`)

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccess() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const updateSocketToken = (): void => {
  if (socket) {
    socket.auth = { token: tokenStorage.getAccess() };
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
};