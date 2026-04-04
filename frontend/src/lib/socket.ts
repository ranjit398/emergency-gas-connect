import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5002'
    : 'https://emergency-gas-backend.onrender.com');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccess() ?? '' },
      transports: ['websocket', 'polling'],  // websocket first, polling fallback
      withCredentials: true,                  // ← critical for CORS with credentials
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        socket?.removeAllListeners();
        socket = null;
      }
    });

    socket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts');
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after 5 attempts. Check backend status.');
      socket?.removeAllListeners();
      socket = null;
    });

    socket.on('error', (err) => {
      console.error('[Socket] Socket-level error:', err);
    });
  }
  return socket;
}

export function updateSocketToken() {
  if (socket) {
    socket.auth = { token: tokenStorage.getAccess() ?? '' };
    socket.disconnect().connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}