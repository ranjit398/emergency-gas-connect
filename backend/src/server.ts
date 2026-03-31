
import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import connectDatabase from '@config/database';
import config from '@config/index';
import logger from '@utils/logger';
import { requestLogger } from '@middleware/index';
import errorHandler from '@middleware/errorHandler';
import { apiLimiter, authLimiter } from '@middleware/rateLimiter';
import { socketHandler } from '@socket/handlers';

// Existing routes
import authRoutes       from '@routes/auth';
import profileRoutes    from '@routes/profile';
import requestRoutes    from '@routes/requests';
import providerRoutes   from '@routes/providers';
import providerDashboardRoutes from '@routes/provider-dashboard';
import messageRoutes    from '@routes/messages';
import ratingRoutes     from '@routes/ratings';
import notificationRoutes from '@routes/notifications';

// Smart matching routes
import matchRoutes from '@routes/smart/match.routes';

// ── NEW: Live data routes ───────────────────────────────────────────────────
import liveRoutes from '@routes/live';

// ── NEW: Inject io into request service ───────────────────────────────────
import { setSocketIO } from '@services/EmergencyRequestService';
import { setLifecycleIO } from '@services/requestLifecycle.service';
import { setReassignmentIO } from '@services/reassignment.service';

// ─────────────────────────────────────────────────────────────────────────────

const app: Express = express();
const httpServer = createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Inject io into service layer (before any routes handle requests) ───────
setSocketIO(io);
setLifecycleIO(io);
setReassignmentIO(io);

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(requestLogger);

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// ── Socket handlers ────────────────────────────────────────────────────────
socketHandler(io);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    features: ['priority-engine', 'smart-matching', 'live-activity', 'recommendations'],
  });
});

// ── API v1 routes ──────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use(apiLimiter);

// Auth (stricter rate limit)
v1.use('/auth', authLimiter, authRoutes);

// Existing routes
v1.use('/profile',       profileRoutes);
v1.use('/requests',      requestRoutes);
v1.use('/providers',     providerRoutes);
v1.use('/provider-dashboard', providerDashboardRoutes);
v1.use('/messages',      messageRoutes);
v1.use('/ratings',       ratingRoutes);
v1.use('/notifications', notificationRoutes);
v1.use('/match', matchRoutes);
v1.use('/live', liveRoutes);

app.use('/api/v1', v1);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { status: 404, message: 'Route not found', path: req.path },
  });
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDatabase();
  const PORT = config.port;
  
  // Prevent MaxListenersExceededWarning
  httpServer.setMaxListeners(50);
  
  // Set socket options for faster rebinding after restart
  httpServer.on('connection', (socket) => {
    socket.setNoDelay(true);
  });
  
  // Enable SO_REUSEADDR to allow quick port reuse (Unix-like systems)
  try {
    (httpServer as any).setsockopt?.(require('net').TCP_NODELAY, 1);
  } catch (e) {
    // Ignore if not available
  }
  
  let retries = 0;
  const maxRetries = 3;
  
  httpServer.once('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && retries < maxRetries) {
      retries++;
      logger.warn(`Port ${PORT} in use, retrying (${retries}/${maxRetries}) in 2 seconds...`);
      setTimeout(() => {
        httpServer.close();
        setTimeout(startServer, 1000);
      }, 2000);
      return;
    }
    logger.error(`Failed to bind to port ${PORT}:`, err.message);
    process.exit(1);
  });
  
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`✓ Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info('Features: priority-engine | smart-matching | live-activity | geo-matching');
  });
};

// ── Graceful shutdown ──────────────────────────────────────────────────────
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  // Close all connections first
  if (typeof (httpServer as any).closeAllConnections === 'function') {
    (httpServer as any).closeAllConnections?.();
  }
  
  // Close socket.io connections
  io.close();
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => { 
    logger.error('Forced shutdown after 10s'); 
    process.exit(1); 
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { io };
export default httpServer;