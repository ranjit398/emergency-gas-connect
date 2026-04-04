
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

// Routes
import authRoutes             from '@routes/auth';
import profileRoutes          from '@routes/profile';
import requestRoutes          from '@routes/requests';
import providerRoutes         from '@routes/providers';
import providerDashboardRoutes from '@routes/provider-dashboard';
import messageRoutes          from '@routes/messages';
import ratingRoutes           from '@routes/ratings';
import notificationRoutes     from '@routes/notifications';
import matchRoutes            from '@routes/smart/match.routes';
import liveRoutes             from '@routes/live';

// Service IO injection
import { setSocketIO }       from '@services/EmergencyRequestService';
import { setLifecycleIO }    from '@services/requestLifecycle.service';
import { setReassignmentIO } from '@services/reassignment.service';

// ── App setup ─────────────────────────────────────────────────────────────────
const app: Express = express();
const httpServer   = createServer(app);

// ── CORS: single source of truth ─────────────────────────────────────────────
const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://emergency-gas-frontend.onrender.com',
];

// Add any extra origins from env
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}
if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.trim();
  if (url && !allowedOrigins.includes(url)) allowedOrigins.push(url);
}

logger.info('[CORS] Allowed origins:', allowedOrigins);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  // polling only — Render free tier does not support WebSocket upgrades
  transports: ['polling'],
  allowUpgrades: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
});

logger.info('[Socket.IO] Initialized with transports: polling only');

// Inject io into services
setSocketIO(io);
setLifecycleIO(io);
setReassignmentIO(io);

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // disable CSP to avoid blocking Socket.IO
}));

// ── Express CORS ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, false); // don't throw — just reject silently
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

// Handle preflight for all routes
app.options('*', cors({
  origin: allowedOrigins,
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
app.set('io', io);

// ── Socket handlers ────────────────────────────────────────────────────────────
socketHandler(io);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    socketIO: 'active',
    allowedOrigins,
  });
});

app.get('/favicon.ico', (_req: Request, res: Response) => res.status(204).end());

// ── API v1 ────────────────────────────────────────────────────────────────────
const v1 = express.Router();
v1.use(apiLimiter);
v1.use('/auth',               authLimiter, authRoutes);
v1.use('/profile',            profileRoutes);
v1.use('/requests',           requestRoutes);
v1.use('/providers',          providerRoutes);
v1.use('/provider-dashboard', providerDashboardRoutes);
v1.use('/provider',           providerDashboardRoutes);
v1.use('/messages',           messageRoutes);
v1.use('/ratings',            ratingRoutes);
v1.use('/notifications',      notificationRoutes);
v1.use('/match',              matchRoutes);
v1.use('/live',               liveRoutes);
app.use('/api/v1', v1);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { status: 404, message: 'Route not found', path: req.path },
  });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDatabase();
  } catch (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }

  const PORT = config.port || 5000;
  httpServer.setMaxListeners(50);

  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`✓ Server running on port ${PORT}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  httpServer.on('error', (err: any) => {
    logger.error('Server error:', err);
    process.exit(1);
  });
};

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down...`);
  io.close();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { io };
export default httpServer;