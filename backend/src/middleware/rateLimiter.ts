// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
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
  message: {
    success: false,
    error: { message: 'Too many auth attempts, please try again later.' },
  },
});