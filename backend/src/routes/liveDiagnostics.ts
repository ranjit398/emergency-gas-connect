// backend/src/routes/liveDiagnostics.ts
// NEW — Diagnostic endpoints to verify live data flow
// Only use for debugging/monitoring

import express, { Router } from 'express';
import { asyncHandler } from '@middleware/index';
import { success } from '@utils/response';
import { authMiddleware } from '@middleware/auth';
import EmergencyRequest from '@models/EmergencyRequest';
import Provider from '@models/Provider';
import Profile from '@models/Profile';
import Rating from '@models/Rating';
import logger from '@utils/logger';

const router: Router = express.Router();
router.use(authMiddleware);

// Verify live data connectivity
router.get('/health', asyncHandler(async (req, res) => {
  const collections = {
    emergencyRequests: await EmergencyRequest.countDocuments(),
    providers: await Provider.countDocuments(),
    profiles: await Profile.countDocuments(),
    ratings: await Rating.countDocuments(),
  };

  res.json(success({
    status: 'ok',
    timestamp: new Date(),
    collections,
    environment: process.env.NODE_ENV,
  }, 'Live data health check'));
}));

// Get user's role for debugging
router.get('/whoami', asyncHandler(async (req, res) => {
  const user = req.user;
  const provider = await Provider.findOne({ userId: req.userId });
  const profile = await Profile.findOne({ userId: req.userId });

  res.json(success({
    userId: req.userId,
    userRole: req.user?.role,
    hasProvider: !!provider,
    hasProfile: !!profile,
    userEmail: user?.email,
  }));
}));

// Check most recent requests for data freshness
router.get('/recent-requests', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  const requests = await EmergencyRequest.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('status cylinderType quantity address seekerId helperId providerId createdAt updatedAt')
    .lean();

  res.json(success({
    count: requests.length,
    recent: requests.map(r => ({
      id: r._id,
      status: r.status,
      cylinderType: r.cylinderType,
      quantity: r.quantity,
      address: r.address,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ageMs: Date.now() - new Date(r.createdAt).getTime(),
    })),
  }, `Retrieved ${requests.length} recent requests`));
}));

// Test provider live data
router.get('/provider-test', asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.userId });
  if (!provider) return res.json({ error: 'No provider profile' });

  const requests = await EmergencyRequest.countDocuments({ providerId: provider._id });
  const completed = await EmergencyRequest.countDocuments({ providerId: provider._id, status: 'completed' });
  const pending = await EmergencyRequest.countDocuments({ providerId: provider._id, status: 'pending' });
  const active = await EmergencyRequest.countDocuments({ providerId: provider._id, status: 'accepted' });

  logger.info(`[Diagnostic] Provider ${req.userId}: total=${requests}, completed=${completed}, pending=${pending}, active=${active}`);

  res.json(success({
    providerId: provider._id,
    totalRequests: requests,
    completedRequests: completed,
    pendingRequests: pending,
    activeRequests: active,
    timestamp: new Date(),
  }));
}));

export default router;
