import dotenv from 'dotenv';

dotenv.config();

// ✅ CRITICAL: Build CORS origins dynamically to handle Render deployment
const buildCorsOrigins = (): string[] => {
  // If CORS_ORIGIN is explicitly set, use it
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(url => url.trim());
  }

  // Default development origins
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  // In production, add Render frontend URL
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    origins.push('https://emergency-gas-frontend.onrender.com');
    
    // Also add RENDER_ORIGINAL_URL if available (for internal communication)
    if (process.env.RENDER_ORIGINAL_URL) {
      origins.push(process.env.RENDER_ORIGINAL_URL);
    }
  }

  return origins;
};

export default {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-gas',
  corsOrigin: buildCorsOrigins(),
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiry: process.env.JWT_EXPIRY || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@emergencygas.com',
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
};
