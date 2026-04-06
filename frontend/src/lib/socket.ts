// frontend/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace('/api/v1', '') ||
  'https://emergency-gas-backend.onrender.com'
);

console.log('[Socket] Target URL:', SOCKET_URL);

let socket: Socket | null = null;
let failedPermanently = false;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (failedPermanently && socket) return socket; // return stub, don't reconnect

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token: tokenStorage.getAccess() ?? '' },
    transports: ['polling'],
    upgrade: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 3,        // stop after 3 — don't hammer server
    reconnectionDelay: 8000,
    reconnectionDelayMax: 30000,
    timeout: 15000,
    forceNew: false,
  });

  socket.on('connect', () => {
    failedPermanently = false;
    console.log('[Socket] ✅ Connected:', socket?.id);
  });

  socket.on('connect_error', (err: any) => {
    console.warn('[Socket] ⚠️ Cannot connect (app works without real-time):', err.message);
  });

  socket.on('reconnect_failed', () => {
    failedPermanently = true;
    console.warn('[Socket] Stopped retrying — using HTTP polling fallback');
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io client disconnect') {
      console.warn('[Socket] Disconnected:', reason);
    }
  });

  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function updateSocketToken() {
  const token = tokenStorage.getAccess() ?? '';
  if (socket && !failedPermanently) {
    socket.auth = { token };
    if (socket.connected) socket.disconnect().connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    failedPermanently = false;
  }
}

