/**
 * Emergency Request Routes
 * Defines all API endpoints for emergency gas request operations
 */

import express, { Router } from 'express';
import emergencyRequestController, {
  createRequestValidation,
  completeRequestValidation,
} from './controllers/EmergencyRequestController';
import { authMiddleware, requireRole } from './middleware/auth';
import { validate } from './middleware/validation';
import { validateMongoId, validatePagination } from './utils/validators';

const router: Router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/requests
 * Create a new emergency gas request
 * Role: seeker
 * Validation: cylinderType, quantity, address, latitude, longitude
 */
router.post(
  '/',
  requireRole('seeker'),
  validate(createRequestValidation),
  emergencyRequestController.createRequest
);

/**
 * GET /api/requests/user
 * Get all requests for authenticated user (filtered by role)
 * Query params: page, limit
 */
router.get(
  '/user',
  validate(validatePagination()),
  emergencyRequestController.getUserRequests
);

/**
 * GET /api/requests/pending
 * Get all pending requests with optional location-based filtering
 * Query params: latitude (optional), longitude (optional), maxDistance (optional), page, limit
 */
router.get(
  '/pending',
  validate(validatePagination()),
  emergencyRequestController.getPendingRequests
);

/**
 * GET /api/requests/stats
 * Get stats for authenticated user
 */
router.get(
  '/stats',
  emergencyRequestController.getStats
);

/**
 * GET /api/requests/:id
 * Get a specific emergency request by ID
 */
router.get(
  '/:id',
  validate(validateMongoId('id')),
  emergencyRequestController.getRequest
);

/**
 * PUT /api/requests/:id/accept
 * Accept a pending emergency request
 * Role: helper
 */
router.put(
  '/:id/accept',
  requireRole('helper'),
  validate(validateMongoId('id')),
  emergencyRequestController.acceptRequest
);

/**
 * PUT /api/requests/:id/complete
 * Complete an emergency request with optional rating and review
 * Validation: rating (1-5), review (optional, max 500 chars)
 */
router.put(
  '/:id/complete',
  validate([...validateMongoId('id'), ...completeRequestValidation]),
  emergencyRequestController.completeRequest
);

/**
 * PUT /api/requests/:id/cancel
 * Cancel an emergency request
 */
router.put(
  '/:id/cancel',
  validate(validateMongoId('id')),
  emergencyRequestController.cancelRequest
);

/**
 * NEW FEATURES - Status Lifecycle & Reassignment
 */

/**
 * PUT /api/requests/:id/mark-in-progress
 * Mark request as in_progress (helper is on the way)
 * Role: helper
 */
router.put(
  '/:id/mark-in-progress',
  requireRole('helper'),
  validate(validateMongoId('id')),
  emergencyRequestController.markInProgress
);

/**
 * PUT /api/requests/:id/request-again
 * Reassign request to find new helper
 * Role: seeker
 * Query: latitude (optional), longitude (optional)
 */
router.put(
  '/:id/request-again',
  requireRole('seeker'),
  validate(validateMongoId('id')),
  emergencyRequestController.requestAgain
);

/**
 * GET /api/requests/:id/timeline
 * Get request lifecycle timeline
 */
router.get(
  '/:id/timeline',
  validate(validateMongoId('id')),
  emergencyRequestController.getTimeline
);

/**
 * GET /api/requests/:id/reassignment-history
 * Get reassignment history and status
 * Role: seeker, helper
 */
router.get(
  '/:id/reassignment-history',
  validate(validateMongoId('id')),
  emergencyRequestController.getReassignmentHistory
);

/**
 * GET /api/requests/:id/recommended-helpers
 * Get smart-tagged helper recommendations
 * Used to show best helpers for a request
 */
router.get(
  '/:id/recommended-helpers',
  validate(validateMongoId('id')),
  emergencyRequestController.getRecommendedHelpers
);

export default router;
