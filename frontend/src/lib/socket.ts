import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL?.replace('/api/v1', '')
  || 'https://emergency-gas-backend.onrender.com';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccess() ?? '' },
      transports: ['polling'],   // ✅ polling ONLY — Render free tier blocks WebSocket
      upgrade: false,             // ✅ never try to upgrade to WebSocket
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,    // ✅ 5s between retries (slower to avoid hammering server)
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