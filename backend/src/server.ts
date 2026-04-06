import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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

import authRoutes              from '@routes/auth';
import profileRoutes           from '@routes/profile';
import requestRoutes           from '@routes/requests';
import providerRoutes          from '@routes/providers';
import providerDashboardRoutes from '@routes/provider-dashboard';
import messageRoutes           from '@routes/messages';
import ratingRoutes            from '@routes/ratings';
import notificationRoutes      from '@routes/notifications';
import matchRoutes             from '@routes/smart/match.routes';
import liveRoutes              from '@routes/live';
import liveDiagnosticsRoutes   from '@routes/liveDiagnostics';
import { setSocketIO }         from '@services/EmergencyRequestService';
import { setLifecycleIO }      from '@services/requestLifecycle.service';
import { setReassignmentIO }   from '@services/reassignment.service';
import { initializeRealtimeSync } from '@services/realtimeDataSync.service';
import { logSocketDebugInfo }  from '@utils/socketDebugLog';

// ─────────────────────────────────────────────────────────────────────────────
const app: Express = express();
const httpServer   = createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://emergency-gas-frontend.onrender.com',
];

(process.env.CORS_ORIGIN || '').split(',').forEach(o => {
  const t = o.trim();
  if (t && !ALLOWED_ORIGINS.includes(t)) ALLOWED_ORIGINS.push(t);
});

console.log('[Boot] Allowed origins:', ALLOWED_ORIGINS);

// ─────────────────────────────────────────────────────────────────────────────
// CORE FIX: Patch res.writeHead to FORCE inject CORS headers on every response.
// Render's proxy strips headers set by Socket.IO's internal handler.
// Patching writeHead guarantees headers survive — they are written last,
// overriding anything the proxy might strip or fail to forward.
// ─────────────────────────────────────────────────────────────────────────────
httpServer.on('request', (req, res) => {
  // Read origin from the request — Render forwards X-Forwarded-* headers
  // so check both req.headers.origin and X-Forwarded-For as fallback
  const origin = (req.headers['origin'] || req.headers['x-forwarded-host']) as string | undefined;

  const corsOrigin = (origin && ALLOWED_ORIGINS.includes(origin))
    ? origin
    : 'https://emergency-gas-frontend.onrender.com'; // safe default for Render

  // Patch writeHead on this response to inject CORS before headers are sent
  const originalWriteHead = res.writeHead.bind(res);
  (res as any).writeHead = function(statusCode: number, ...args: any[]) {
    // Inject our CORS headers — these override anything previously set
    try {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
    } catch {
      // Headers already sent — ignore
    }
    return originalWriteHead(statusCode, ...args);
  };

  // Handle OPTIONS preflight immediately at raw HTTP level
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO — allow all origins since writeHead patch handles CORS
// ─────────────────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',          // Wildcard — writeHead patch above sets the real origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
});

setSocketIO(io);
setLifecycleIO(io);
setReassignmentIO(io);
logSocketDebugInfo();

console.log('[Boot] Socket.IO ready');

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// Express CORS for API routes (writeHead patch covers socket.io)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  next();
});

app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(requestLogger);
app.set('io', io);

socketHandler(io);

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────
console.log('[Boot] Registering /health route...');
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    env: config.nodeEnv,
    allowedOrigins: ALLOWED_ORIGINS,
    corsMode: 'writeHead-patch',
  });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

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
v1.use('/diagnostics',        liveDiagnosticsRoutes);
app.use('/api/v1', v1);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { message: 'Not found' } });
});

app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    console.log('[Boot] Connecting to MongoDB...');
    await connectDatabase();
    console.log('[Boot] ✓ MongoDB connected');

    initializeRealtimeSync(io);
    console.log('[Boot] Real-time data sync initialized');

    console.log('[Boot] Setting up HTTP server...');
    const PORT = Number(process.env.PORT) || 5000;
    httpServer.setMaxListeners(50);
    console.log(`[Boot] HTTP server configured, PORT=${PORT}`);

    console.log('[Boot] Binding to port...');
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`[Boot] ✓ Listening on ${PORT}`);
        resolve();
      });
      httpServer.on('error', (err: any) => {
        console.error('[Boot] HTTP error:', err);
        reject(err);
      });
    });

    console.log('[Boot] ✓ Server fully initialized');
  } catch (err) {
    console.error('[Boot] FATAL ERROR:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => { io.close(); httpServer.close(() => process.exit(0)); });
process.on('SIGINT',  () => { io.close(); httpServer.close(() => process.exit(0)); });
process.on('unhandledRejection', (r) => console.error('UnhandledRejection:', r));
process.on('uncaughtException',  (e) => { console.error('UncaughtException:', e); process.exit(1); });

console.log('[Boot] Starting server...');
startServer();
export { io };
export default httpServer;