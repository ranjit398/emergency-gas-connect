// backend/src/controllers/ProviderDashboardController.ts

import { Request, Response } from 'express';
import { success } from '@utils/response';
import ProviderDashboardService from '@services/ProviderDashboardService';
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
}

export default new ProviderDashboardController();