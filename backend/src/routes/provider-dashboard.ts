import express, { Router, Request, Response } from 'express';
import providerDashboardController from '@controllers/ProviderDashboardController';
import { authMiddleware, requireRole } from '@middleware/auth';
import { asyncHandler } from '@middleware/index';
import dashboardService from '@services/dashboard.service';
import analyticsService from '@services/analytics.service';
import smartTaggingService from '@services/smartTagging.service';
import ProviderService from '@services/ProviderService';
import EmergencyRequest from '@models/EmergencyRequest';
import { success } from '@utils/response';

const router: Router = express.Router();

// ── NEW: Platform-wide stats (public, no auth needed) ────────────────────────
router.get('/platform', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardService.getPlatformStats();
  res.json(success(stats));
}));

// All routes below require provider role
router.use(authMiddleware);
router.use(requireRole('provider'));

// ── NEW: Real aggregated provider stats ──────────────────────────────────────
// GET /provider-dashboard/stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const provider = await ProviderService.getProviderByUserId(req.userId!);
  const stats = await dashboardService.getProviderStats(provider.id);
  res.json(success(stats, 'Provider stats loaded'));
}));

// ── EXISTING routes (unchanged) ──────────────────────────────────────────────
router.get('/',                              providerDashboardController.getDashboard);
router.get('/time-series',                   providerDashboardController.getTimeSeries);
router.get('/orders/pending',                providerDashboardController.getPendingOrders);
router.post('/orders/:requestId/ready',      providerDashboardController.markOrderReady);
router.post('/orders/:requestId/collected',  providerDashboardController.markOrderCollected);
router.get('/nearby-requests',               providerDashboardController.getNearbyRequests);
router.post('/fulfill/:requestId',           providerDashboardController.fulfillRequestDirectly);
router.put('/inventory',                     providerDashboardController.updateInventory);
router.get('/metrics',                       providerDashboardController.getMetrics);

/**
 * NEW ENDPOINTS - Provider Analytics & Management
 */

// ── GET /provider-dashboard/analytics ────────────────────────────────────────
// Get comprehensive provider analytics
router.get('/analytics/overview', asyncHandler(async (req: Request, res: Response) => {
  const provider = await ProviderService.getProviderByUserId(req.userId!);
  const analytics = await analyticsService.getProviderAnalytics(provider.id.toString());
  res.json(success(analytics, 'Provider analytics loaded'));
}));

// ── GET /provider-dashboard/helper-metrics/:helperId ──────────────────────────
// Get specific helper performance metrics
router.get('/analytics/helper/:helperId', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await analyticsService.getHelperMetrics(req.params.helperId);
  res.json(success(metrics, 'Helper metrics loaded'));
}));

// ── GET /provider-dashboard/active-requests ──────────────────────────────────
// Get all active requests assigned to provider's helpers
router.get('/requests/active', asyncHandler(async (req: Request, res: Response) => {
  const provider = await ProviderService.getProviderByUserId(req.userId!);
  const requests = await EmergencyRequest.find({
    providerId: provider.id,
    status: { $in: ['pending', 'accepted', 'in_progress'] },
  })
    .populate('seekerId', 'fullName phone email')
    .populate('helperId', 'fullName phone rating')
    .sort({ createdAt: -1 });
  res.json(success(requests, 'Active requests loaded'));
}));

// ── GET /provider-dashboard/completed-requests ───────────────────────────────
// Get completed requests with analytics
router.get('/requests/completed', asyncHandler(async (req: Request, res: Response) => {
  const provider = await ProviderService.getProviderByUserId(req.userId!);
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const requests = await EmergencyRequest.find({
    providerId: provider.id,
    status: 'completed',
  })
    .populate('seekerId', 'fullName phone')
    .populate('helperId', 'fullName rating')
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await EmergencyRequest.countDocuments({
    providerId: provider.id,
    status: 'completed',
  });

  res.json(
    success(
      { requests, pagination: { page, limit, total, hasMore: skip + limit < total } },
      'Completed requests loaded'
    )
  );
}));

// ── POST /provider-dashboard/assign-helper ───────────────────────────────────
// Manually assign helper to pending request
router.post('/requests/:requestId/assign-helper', asyncHandler(async (req: Request, res: Response) => {
  const { helperId } = req.body;
  const provider = await ProviderService.getProviderByUserId(req.userId!);

  const request = await EmergencyRequest.findById(req.params.requestId);
  if (!request) {
    return res.status(404).json({ success: false, error: { message: 'Request not found' } });
  }

  // Update request with helper
  request.helperId = helperId;
  request.status = 'accepted';
  request.acceptedAt = new Date();
  request.assignedAt = new Date();
  await request.save();

  res.json(success({ request }, 'Helper assigned successfully'));
}));

// ── GET /provider-dashboard/recommended-helpers/:requestId ───────────────────
// Get smart-tagged recommended helpers for a request
router.get('/requests/:requestId/recommended-helpers', asyncHandler(async (req: Request, res: Response) => {
  const recommendations = await smartTaggingService.getRecommendedHelpers(req.params.requestId, 5);
  res.json(success(recommendations, 'Helper recommendations loaded'));
}));

export default router;