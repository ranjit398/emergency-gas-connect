// frontend/src/components/SocketStatus.tsx
// Real-time socket status indicator for provider dashboard

import React, { useEffect, useState } from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import { getSocket } from '../lib/socket';

export function SocketStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [transport, setTransport] = useState<string>('');
  const [room, setRoom] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    const updateStatus = () => {
      setStatus(socket.connected ? 'connected' : 'disconnected');
      setTransport(socket.io?.engine?.transport?.name || 'unknown');
      
      // Get joined rooms from socket internal state
      const rooms = (socket as any).rooms ? Array.from((socket as any).rooms).join(', ') : 'none';
      setRoom(rooms.substring(0, 50) + (rooms.length > 50 ? '...' : ''));
    };

    updateStatus();

    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);
    socket.on('connect_error', () => setStatus('disconnected'));

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
      socket.off('connect_error');
    };
  }, []);

  const colors = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    disconnected: '#ef4444',
  };

  return (
    <Tooltip title={`Transport: ${transport} | Rooms: ${room} | Open DevTools > Console and run: socketDebugger.healthCheck()`}>
      <Chip
        size="small"
        label={status === 'connected' ? '🟢 Socket Connected' : status === 'connecting' ? '🟡 Connecting' : '🔴 Disconnected'}
        sx={{
          bgcolor: `${colors[status]}20`,
          color: colors[status],
          fontWeight: 600,
          fontSize: '11px',
          border: `1px solid ${colors[status]}40`,
        }}
      />
    </Tooltip>
  );
}

export default SocketStatus;
