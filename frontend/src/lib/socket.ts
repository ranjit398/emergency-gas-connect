import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace('/api/v1', '') ||
  'https://emergency-gas-backend.onrender.com'
);

console.log('[Socket] Connecting to:', SOCKET_URL);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

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
    reconnectionAttempts: 5,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
    forceNew: false,
    rejectUnauthorized: false,  // For self-signed certs
    secure: true,               // Force HTTPS
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Connected:', socket?.id);
  });

  socket.on('connect_error', (err: any) => {
    console.error('[Socket] ❌ Connection error:', {
      message: err.message,
      type: err.type,
      code: err.code,
      status: err.status,
    });
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] ⚠️ Disconnected:', reason);
  });

  return socket;
}

export function updateSocketToken() {
  const token = tokenStorage.getAccess() ?? '';
  if (socket) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}