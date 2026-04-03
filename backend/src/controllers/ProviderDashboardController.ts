// backend/src/controllers/providerDashboard.controller.ts

import { Request, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '@middleware/index';
import { success, paginated } from '@utils/response';
import {
  getProviderDashboardStats,
  getProviderRequests,
  getProviderHelpers,
  getProviderInventory,
  updateProviderInventory,
  getActivityFeed,
  getBusinessInsights,
} from '@services/providerDashboard.service';

export class ProviderDashboardController {

  // GET /api/v1/provider/dashboard
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const data = await getProviderDashboardStats(req.userId!);
    res.json(success(data, 'Dashboard loaded'));
  });

  // GET /api/v1/provider/requests?page=1&limit=20&status=all
  getRequests = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = req.query.status as string | undefined;
    const result = await getProviderRequests(req.userId!, page, limit, status);
    res.json({ success: true, ...result });
  });

  // GET /api/v1/provider/helpers
  getHelpers = asyncHandler(async (req: Request, res: Response) => {
    const data = await getProviderHelpers(req.userId!);
    res.json(success(data, 'Helpers loaded'));
  });

  // GET /api/v1/provider/inventory
  getInventory = asyncHandler(async (req: Request, res: Response) => {
    const data = await getProviderInventory(req.userId!);
    res.json(success(data));
  });

  // PUT /api/v1/provider/inventory
  updateInventory = asyncHandler(async (req: Request, res: Response) => {
    const { lpgStock, cngStock } = req.body;
    const data = await updateProviderInventory(req.userId!, { lpgStock, cngStock });
    res.json(success(data, 'Inventory updated'));
  });

  // GET /api/v1/provider/activity
  getActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const data = await getActivityFeed(req.userId!, limit);
    res.json(success(data));
  });

  // GET /api/v1/provider/insights
  getInsights = asyncHandler(async (req: Request, res: Response) => {
    const data = await getBusinessInsights(req.userId!);
    res.json(success(data));
  });
}

export const updateInventoryValidation = [
  body('lpgStock').optional().isInt({ min: 0 }).withMessage('LPG stock must be 0 or more'),
  body('cngStock').optional().isInt({ min: 0 }).withMessage('CNG stock must be 0 or more'),
];

export default new ProviderDashboardController();