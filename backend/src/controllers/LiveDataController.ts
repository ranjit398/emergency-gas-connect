// backend/src/controllers/LiveDataController.ts

import { Request, Response } from 'express';
import { asyncHandler } from './middleware/index';
import { success } from './utils/response';
import { getLiveData, getProviderLiveData, getHelperLiveData, getSeekerLiveData } from './services/LiveDataService';

export class LiveDataController {
  // GET /api/v1/live/me  — role-aware, single call for entire dashboard
  getMyLiveData = asyncHandler(async (req: Request, res: Response) => {
    const data = await getLiveData(req.userId!, req.user!.role);
    res.json(success(data, 'Live data loaded'));
  });

  // GET /api/v1/live/provider
  getProviderData = asyncHandler(async (req: Request, res: Response) => {
    const data = await getProviderLiveData(req.userId!);
    res.json(success(data));
  });

  // GET /api/v1/live/helper
  getHelperData = asyncHandler(async (req: Request, res: Response) => {
    const data = await getHelperLiveData(req.userId!);
    res.json(success(data));
  });

  // GET /api/v1/live/seeker
  getSeekerData = asyncHandler(async (req: Request, res: Response) => {
    const data = await getSeekerLiveData(req.userId!);
    res.json(success(data));
  });
}

export default new LiveDataController();
