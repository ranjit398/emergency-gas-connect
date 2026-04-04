import rateLimit from 'express-rate-limit';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // ✅ raised from 100 to accommodate provider dashboard polling
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later.' },
  },
  skip: (req) => {
    // ✅ skip rate limiting for provider dashboard (it polls frequently)
    return req.path.startsWith('/provider') || req.path.startsWith('/live');
  },
});

// Lenient limiter for live data endpoints (they poll frequently)
export const liveDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute = 1 every 2 seconds
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit per user, not per IP
    return (req as any).user?.id || req.ip || 'anonymous';
  },
  message: {
    success: false,
    error: { message: 'Too many live data requests. Please wait a moment.' },
  },
});

// Strict limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  },
});

// Request creation limiter (emergency requests)
export const requestCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 emergency requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests created. Please wait before creating another.' },
  },
});