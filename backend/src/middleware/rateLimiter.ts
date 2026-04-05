// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

// Key generator: extract client IP from X-Forwarded-For (set by reverse proxy) or from socket.remoteAddress
const keyGenerator = (req: any) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req) => {
    // Never rate-limit provider dashboard, live data, or socket.io
    return (
      req.path.startsWith('/provider') ||
      req.path.startsWith('/live') ||
      req.path.startsWith('/socket.io')
    );
  },
  message: {
    success: false,
    error: { message: 'Too many requests, please try again in a few minutes.' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    success: false,
    error: { message: 'Too many auth attempts, please try again later.' },
  },
});