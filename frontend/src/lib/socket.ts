import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './api';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5002'
    : 'https://emergency-gas-backend.onrender.com');

let socket: Socket | null = null;
let isConnecting = false; // ✅ guard against double-init

export const getSocket = (): Socket => {
  // Return existing connected socket immediately
  if (socket?.connected) return socket;

  // Prevent duplicate socket creation during connect handshake
  if (isConnecting && socket) return socket;

  // Clean up a dead socket before creating a new one
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  isConnecting = true;

  socket = io(SOCKET_URL, {
    auth: { token: tokenStorage.getAccess() },

    // ✅ CRITICAL FIX: polling MUST come first on Render
    // Render's proxy doesn't support direct WebSocket upgrades.
    // Socket.IO starts with polling, then upgrades to WebSocket automatically.
    transports: ['polling', 'websocket'],

    reconnection: true,
    reconnectionAttempts: 5,      // ✅ was 10 — caused the reconnect storm in logs
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,  // ✅ was 5000 — exponential backoff needs more room
    randomizationFactor: 0.5,     // ✅ adds jitter so clients don't all retry together
    timeout: 20000,

    // ✅ Remove these two — they conflict with Render's SSL termination proxy.
    // Render handles TLS at the edge; the Node process speaks plain HTTP behind it.
    // secure: true,            // removed
    // rejectUnauthorized: false, // removed
  });

  socket.on('connect', () => {
    isConnecting = false;
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    isConnecting = false;
    // Downgrade to info — this fires on every retry attempt and was flooding logs
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);

    // 'io server disconnect' means the server forcibly closed — don't auto-reconnect
    // (token probably expired); let updateSocketToken() handle re-auth instead.
    if (reason === 'io server disconnect') {
      socket?.removeAllListeners();
      socket = null;
    }
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    // All 5 attempts exhausted — surface a user-friendly message
    console.error('[Socket] Reconnection failed after 5 attempts. Check backend status.');
    socket?.removeAllListeners();
    socket = null;
  });

  socket.on('error', (err) => {
    console.error('[Socket] Socket-level error:', err);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isConnecting = false;
  }
};

/**
 * Call this after login/token-refresh so the socket reconnects with a fresh JWT.
 * The backend's io.use() auth middleware re-verifies the token on every connect.
 */
export const updateSocketToken = (): void => {
  const token = tokenStorage.getAccess();
  if (!token) return;

  if (socket) {
    socket.auth = { token };
    // Force a clean reconnect so the new token goes through the auth middleware
    socket.disconnect().connect();
  }
};