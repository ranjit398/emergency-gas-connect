// backend/src/routes/live.ts

import express, { Router } from 'express';
import liveDataController from '@controllers/LiveDataController';
import { authMiddleware } from '@middleware/auth';
import { apiLimiter } from '@middleware/rateLimiter';

const router: Router = express.Router();

// All live data routes require authentication
router.use(authMiddleware);
router.use(apiLimiter);

// Role-aware endpoint — returns data based on user's role
router.get('/me', liveDataController.getMyLiveData);

// Role-specific endpoints
router.get('/provider', liveDataController.getProviderData);
router.get('/helper', liveDataController.getHelperData);
router.get('/seeker', liveDataController.getSeekerData);

export default router;
