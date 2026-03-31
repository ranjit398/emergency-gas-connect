// backend/src/routes/smart/match.routes.ts

import express, { Router } from 'express';
import matchingController from '@controllers/smart/matching.controller';
import { authMiddleware, requireRole } from '@middleware/auth';

const router: Router = express.Router();

// ── Public (but auth-required) routes ─────────────────────────────────────
router.use(authMiddleware);

// GET /api/v1/match/nearby-helpers?latitude=&longitude=&radius=&limit=
router.get('/nearby-helpers', matchingController.getNearbyHelpers);

// GET /api/v1/match/prioritised-requests?latitude=&longitude=&radius=&cylinderType=&page=&limit=
router.get('/prioritised-requests', matchingController.getPrioritisedRequests);

// GET /api/v1/match/:requestId?radius=15&limit=5
router.get('/:requestId', matchingController.getMatchesForRequest);

// POST /api/v1/match/refresh-priorities  (admin only)
router.post(
  '/refresh-priorities',
  requireRole('admin'),
  matchingController.refreshPriorities
);

export default router;