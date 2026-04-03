
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
const getCorsOrigins = (): string[] => {
  const origins = [...config.corsOrigin]; // Copy array
  const productionFrontend = 'https://emergency-gas-frontend.onrender.com';
  
  // Add production frontend if not already included
  if (!origins.some(o => o.includes('emergency-gas-frontend.onrender.com'))) {
    origins.push(productionFrontend);
  }
  
  // For development, add common localhost variations
  if (config.nodeEnv !== 'production') {
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    devOrigins.forEach(dev => {
      if (!origins.includes(dev)) origins.push(dev);
    });
  }
  
  return origins;
};

const io = new SocketIOServer(httpServer, {
  path: '/socket.io/',
  serveClient: false,
  // ✅ ENABLE BOTH TRANSPORTS: Frontend tries polling first, then upgrades to WebSocket
  // This matches frontend config and works with Render's proxy architecture
  transports: ['polling', 'websocket'],
  cors: {
    origin: getCorsOrigins(), // Use function to get current origins
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },
  pingTimeout: 120000,
  pingInterval: 25000,
  allowUpgrades: true,
  maxHttpBufferSize: 10 * 1024 * 1024,
});

// ✅ Log Socket.IO initialization
console.log('[Socket.IO] Initialized with transports:', io.engine.opts.transports);
console.log('[Socket.IO] CORS origins:', getCorsOrigins());

// ── Inject io into service layer (before any routes handle requests) ───────
setSocketIO(io);
setLifecycleIO(io);
setReassignmentIO(io);

// ── Security middleware ────────────────────────────────────────────────────
// ✅ Configure helmet to allow Socket.IO's eval (required for some transports)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  // ✅ CSP: Allow eval for Socket.IO client functionality
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // ✅ unsafe-eval for Socket.IO
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      connectSrc: [
        "'self'",
        "https://emergency-gas-backend.onrender.com",
        "wss://emergency-gas-backend.onrender.com", // ✅ WebSocket
        "https://emergency-gas-frontend.onrender.com",
      ],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ── CORS headers and middleware (Socket.IO will add its own) ────────────────
const corsOriginsList = getCorsOrigins();
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // ✅ Set CORS headers for ALL requests including socket.io
  if (origin) {
    const allowed = corsOriginsList.some(allowed => {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(pattern).test(origin);
    });
    
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    }
  }
  
  // ✅ Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // 204 No Content
  }
  
  next();
});
  
// ── Express CORS middleware (for REST endpoints) ───────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: Apply CORS headers to EVERYTHING including /socket.io/ polling
// Socket.IO polling transport needs explicit CORS headers on all responses
// ─────────────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const origins = getCorsOrigins();
  const origin = req.headers.origin || '';
  
  // Check if origin is allowed
  if (origins.some(o => origin.includes(o) || o === '*')) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  next();
});

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

// ── Favicon - prevents 404 errors ──────────────────────────────────────────
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

// ── API v1 routes ──────────────────────────────────────────────────────────
const v1 = express.Router();

v1.use(apiLimiter);

// Auth (stricter rate limit)
v1.use('/auth', authLimiter, authRoutes);

// Existing routes
v1.use('/profile',            profileRoutes);
v1.use('/requests',           requestRoutes);
v1.use('/providers',          providerRoutes);
v1.use('/provider-dashboard', providerDashboardRoutes);  // ← legacy path (backward compatibility)
v1.use('/provider',           providerDashboardRoutes);  // ← new path
v1.use('/messages',           messageRoutes);
v1.use('/ratings',            ratingRoutes);
v1.use('/notifications',      notificationRoutes);
v1.use('/match', matchRoutes);
v1.use('/live', liveRoutes);

app.use('/api/v1', v1);

// ── Socket.IO Info endpoint (debugging) ────────────────────────────────────
app.get('/socket.io/info', (req: Request, res: Response) => {
  console.log('[Socket.IO] Info endpoint hit');
  res.json({
    ok: true,
    engines: io.engine.opts.transports,
    origins: getCorsOrigins(),
  });
});

// ── 404 (but NOT for socket.io - Socket.IO handles that) ────────────────────
app.use((req: Request, res: Response) => {
  // Let Socket.IO handle its own paths
  if (req.path.startsWith('/socket.io/')) {
    console.log('[WARN] Express caught socket.io request - should be handled by Socket.IO:', req.path);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
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