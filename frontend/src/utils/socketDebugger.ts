// frontend/src/utils/socketDebugger.ts
// Runtime socket diagnostics — helps verify Socket.IO is working

import { getSocket } from '../lib/socket';

export function setupSocketDebugger() {
  const socket = getSocket();

  // Define debugger object globally for console access
  (window as any).socketDebugger = {
    // Check connection status
    status: () => ({
      connected: socket?.connected,
      id: socket?.id,
      uri: socket?.uri,
      transport: socket?.io?.engine?.transport?.name,
      readyState: socket?.io?.engine?.readyState,
    }),

    // Show all listeners
    listeners: () => {
      const events: Record<string, number> = {};
      if (!socket) return events;
      
      // Get event names from socket._callbacks
      const callbacks = (socket as any)._callbacks;
      if (callbacks) {
        Object.keys(callbacks).forEach((event) => {
          events[event] = callbacks[event].length;
        });
      }
      return events;
    },

    // Monitor events in real-time
    monitor: (duration = 10000, filter?: string) => {
      if (!socket) {
        console.error('Socket not connected');
        return;
      }

      const startTime = Date.now();
      const events: any[] = [];
      const originalOnAny = socket.onAny.bind(socket);

      socket.onAny((eventName: string, ...args: any[]) => {
        if (!filter || eventName.includes(filter)) {
          const elapsed = Date.now() - startTime;
          events.push({
            time: elapsed,
            event: eventName,
            hasData: args.length > 0,
            dataSize: args.length,
          });
          console.log(`[Socket Event] ${elapsed}ms - ${eventName}`, args[0]);
        }
      });

      console.log(`[Socket Debug] Monitoring events for ${duration}ms...`);
      if (filter) console.log(`[Socket Debug] Filter: "${filter}"`);

      setTimeout(() => {
        console.table(events);
        console.log(`[Socket Debug] Total events: ${events.length}`);
      }, duration);
    },

    // Test manual emit
    test: (eventName: string) => {
      if (!socket) {
        console.error('Socket not connected');
        return;
      }
      console.log(`Emitting test event: ${eventName}`);
      socket.emit(eventName);
    },

    // Get connection info
    info: () => {
      if (!socket) return 'Socket not initialized';
      return {
        connected: socket.connected,
        id: socket.id,
        transport: socket.io?.engine?.transport?.name,
        uri: socket.uri,
        url: socket.io?.engine?.hostname,
        port: socket.io?.engine?.port,
        path: socket.io?.engine?.path,
        timestamps: {
          connected: socket.connected,
        },
      };
    },

    // Toggle debug logging
    verboseOn: () => {
      if (!socket) return;
      socket.onAny((eventName: string, ...args: any[]) => {
        console.log(`%c[Socket]%c ${eventName}`, 'color: #00ff00; font-weight: bold', 'color: inherit', args);
      });
      console.log('✅ Verbose socket logging enabled');
    },

    // View active subscriptions/rooms
    rooms: () => {
      if (!socket) return {};
      return socket.rooms ? Array.from(socket.rooms) : [];
    },

    // Quick health check
    healthCheck: async () => {
      if (!socket) {
        return { status: 'error', message: 'Socket not initialized' };
      }

      return {
        connected: socket.connected,
        transport: socket.io?.engine?.transport?.name,
        roomsJoined: socket.rooms ? Array.from(socket.rooms) : [],
        listeners: Object.keys((socket as any)._callbacks || {}),
        latency: (window as any).socketLatency || 'N/A',
        uptime: socket.io?.engine?.uptime,
      };
    },
  };

  // Measure ping/pong latency
  socket.on('pong', () => {
    (window as any).socketLatency = Date.now();
  });

  socket.emit('ping');

  console.log('%c[Socket Debugger] Ready', 'color: #00ff00; font-weight: bold');
  console.log('Use window.socketDebugger to access diagnostics:');
  console.log('  - socketDebugger.status() - Connection status');
  console.log('  - socketDebugger.info() - Detailed connection info');
  console.log('  - socketDebugger.monitor() - Watch event flow');
  console.log('  - socketDebugger.listeners() - List all listeners');
  console.log('  - socketDebugger.rooms() - Show joined rooms');
  console.log('  - socketDebugger.healthCheck() - Full diagnostic');
}

export default setupSocketDebugger;
