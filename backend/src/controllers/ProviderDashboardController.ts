// backend/src/controllers/ProviderDashboardController.ts

import { Request, Response } from 'express';
import { success } from '@utils/response';
import ProviderDashboardService from '@services/ProviderDashboardService';
import providerDashboardService from '@services/providerDashboard.service';
import ProviderService from '@services/ProviderService';
import { asyncHandler } from '@middleware/index';

export class ProviderDashboardController {

  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const stats = await ProviderDashboardService.getDashboardStats(provider.id);
    res.json(success(stats, 'Dashboard loaded'));
  });

  // NEW — 7-day time series for charts
  getTimeSeries = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const data = await ProviderDashboardService.getTimeSeries(provider.id);
    res.json(success(data, '7-day time series'));
  });

  getPendingOrders = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const orders = await ProviderDashboardService.getPendingOrders(provider.id);
    res.json(success({ orders, count: orders.length }, `${orders.length} active orders`));
  });

  markOrderReady = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const result = await ProviderDashboardService.markOrderReady(provider.id, req.params.requestId);
    res.json(success(result, 'Order marked as ready'));
  });

  markOrderCollected = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const result = await ProviderDashboardService.markOrderCollected(provider.id, req.params.requestId);
    res.json(success(result, 'Inventory updated'));
  });

  getNearbyRequests = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const maxDistance = parseInt(req.query.maxDistance as string) || 5000;
    const requests = await ProviderDashboardService.getNearbyRequests(provider.id, maxDistance);
    res.json(success({ requests, count: requests.length }, `${requests.length} nearby requests`));
  });

  fulfillRequestDirectly = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const result = await ProviderDashboardService.fulfillRequestDirectly(provider.id, req.params.requestId);
    res.json(success(result, 'Request fulfilled directly'));
  });

  updateInventory = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: { message: 'updates array is required' } });
    }
    const result = await ProviderDashboardService.updateInventory(provider.id, updates);
    res.json(success(result, 'Inventory updated'));
  });

  getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const metrics = await ProviderDashboardService.getPerformanceMetrics(provider.id);
    res.json(success(metrics, 'Performance metrics'));
  });

  // ════════════════════════════════════════════════════════════════════════════════════
  // NEW ENDPOINTS - Provider Dashboard Enhancement
  // ════════════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/provider-dashboard/stats
   * Get comprehensive dashboard statistics
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const stats = await providerDashboardService.getDashboardStats(provider.id.toString());
    res.json(success(stats, 'Dashboard statistics loaded'));
  });

  /**
   * GET /api/v1/provider-dashboard/requests
   * Get all requests with pagination and filtering
   */
  getRequests = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;

    const result = await providerDashboardService.getProviderRequests(
      provider.id.toString(),
      page,
      limit,
      status
    );

    res.json(success({ requests: result.requests, pagination: result.pagination }, 'Requests loaded'));
  });

  /**
   * GET /api/v1/provider-dashboard/helpers
   * Get helper profiles and performance
   */
  getHelpers = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await providerDashboardService.getProviderHelpers(
      provider.id.toString(),
      page,
      limit
    );

    res.json(success({ helpers: result.helpers, pagination: result.pagination }, 'Helpers loaded'));
  });

  /**
   * GET /api/v1/provider-dashboard/inventory
   * Get current inventory status
   */
  getInventory = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const inventory = await providerDashboardService.getInventory(provider.id.toString());
    res.json(success(inventory, 'Inventory loaded'));
  });

  /**
   * PUT /api/v1/provider-dashboard/inventory
   * Update inventory stock
   */
  updateInventoryStock = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const { lpgStock, cngStock } = req.body;

    const updated = await providerDashboardService.updateInventory(
      provider.id.toString(),
      lpgStock,
      cngStock
    );

    res.json(success(
      {
        lpgStock: updated.lpgStock,
        cngStock: updated.cngStock,
        totalStock: (updated.lpgStock || 0) + (updated.cngStock || 0),
      },
      'Inventory updated'
    ));
  });

  /**
   * GET /api/v1/provider-dashboard/analytics
   * Get detailed provider analytics (30-day)
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const provider = await ProviderService.getProviderByUserId(req.userId!);
    const analytics = await providerDashboardService.getAnalytics(provider.id.toString());
    res.json(success(analytics, 'Analytics loaded'));
  });
}

export default new ProviderDashboardController();