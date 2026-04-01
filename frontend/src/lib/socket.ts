import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

// Connect to backend - in dev use localhost:5002, production will use environment variable
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV 
    ? 'http://localhost:5002' 
    : 'https://emergency-gas-backend.onrender.com');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccess() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
      // Log additional debug information
      console.error('[Socket] Backend URL:', SOCKET_URL);
      console.error('[Socket] Error details:', {
        message: err.message,
        type: err.type,
        data: (err as any).data,
      });
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    socket.on('error', (err) => {
      console.error('[Socket] Error event:', err);
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