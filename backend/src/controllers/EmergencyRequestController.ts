
import { Request, Response } from 'express';
import { body } from 'express-validator';
import emergencyRequestService from '@services/EmergencyRequestService';
import requestLifecycleService from '@services/requestLifecycle.service';
import reassignmentService from '@services/reassignment.service';
import smartTaggingService from '@services/smartTagging.service';
import EmergencyRequest from '@models/EmergencyRequest';
import { asyncHandler } from '@middleware/index';
import { success, paginated } from '@utils/response';

export class EmergencyRequestController {

  createRequest = asyncHandler(async (req: Request, res: Response) => {
    const { cylinderType, quantity, message, latitude, longitude, address } = req.body;
    const request = await emergencyRequestService.createRequest(req.userId!, {
      cylinderType, quantity: quantity ?? 1, message, latitude, longitude, address,
    });
    res.status(201).json(success(request, 'Request created'));
  });

  getRequest = asyncHandler(async (req: Request, res: Response) => {
    const request = await emergencyRequestService.getRequest(req.params.id);
    res.json(success(request));
  });

  getUserRequests = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { requests, total } = await emergencyRequestService.getUserRequests(
      req.userId!, req.user!.role,
      parseInt(page as string), parseInt(limit as string)
    );
    res.json(paginated(requests, parseInt(page as string), parseInt(limit as string), total));
  });

  getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance, page = 1, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      // No location — return all pending sorted by priority
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const [requests, total] = await Promise.all([
        EmergencyRequest.aggregate([
          { $match: { status: 'pending' } },
          { $sort: { priorityScore: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit as string) },
          // Join seeker profile for fullName
          { $lookup: { from: 'profiles', localField: 'seekerId', foreignField: 'userId', as: '_sp' } },
          { $lookup: { from: 'users', localField: 'seekerId', foreignField: '_id', as: '_su' } },
          {
            $addFields: {
              id: { $toString: '$_id' },
              seeker: {
                $let: {
                  vars: { sp: { $arrayElemAt: ['$_sp', 0] }, su: { $arrayElemAt: ['$_su', 0] } },
                  in: { id: '$seekerId', email: '$$su.email', fullName: '$$sp.fullName', phone: '$$sp.phone', avatarUrl: '$$sp.avatarUrl' },
                },
              },
            },
          },
          { $project: { _sp: 0, _su: 0 } },
        ]),
        EmergencyRequest.countDocuments({ status: 'pending' }),
      ]);
      return res.json(paginated(requests, parseInt(page as string), parseInt(limit as string), total));
    }

    const requests = await emergencyRequestService.getPendingRequests(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      maxDistance ? parseInt(maxDistance as string) : 15,
      parseInt(limit as string)
    );
    res.json(success(requests));
  });

  acceptRequest = asyncHandler(async (req: Request, res: Response) => {
    const request = await emergencyRequestService.acceptRequest(req.params.id, req.userId!);
    res.json(success(request, 'Request accepted'));
  });

  completeRequest = asyncHandler(async (req: Request, res: Response) => {
    const { rating, review } = req.body;
    const request = await emergencyRequestService.completeRequest(req.params.id, rating, review);
    res.json(success(request, 'Request completed'));
  });

  cancelRequest = asyncHandler(async (req: Request, res: Response) => {
    const request = await emergencyRequestService.cancelRequest(req.params.id);
    res.json(success(request, 'Request cancelled'));
  });

  markInProgress = asyncHandler(async (req: Request, res: Response) => {
    const request = await requestLifecycleService.markInProgress(req.params.id, req.userId!);
    res.json(success(request, 'Request marked as in progress'));
  });

  requestAgain = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude } = req.query;
    const request = await reassignmentService.requestAgain(
      req.params.id, 
      req.userId!,
      latitude ? parseFloat(latitude as string) : undefined,
      longitude ? parseFloat(longitude as string) : undefined
    );
    res.json(success(request, 'Request reassigned'));
  });

  getTimeline = asyncHandler(async (req: Request, res: Response) => {
    const timeline = await requestLifecycleService.getRequestTimeline(req.params.id);
    res.json(success(timeline));
  });

  getReassignmentHistory = asyncHandler(async (req: Request, res: Response) => {
    const history = await reassignmentService.getReassignmentHistory(req.params.id);
    res.json(success(history));
  });

  getRecommendedHelpers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const helpers = await smartTaggingService.getRecommendedHelpers(req.params.id, parseInt(limit as string));
    res.json(success(helpers));
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await emergencyRequestService.getStats(req.userId!);
    res.json(success(stats));
  });
}

export const createRequestValidation = [
  body('cylinderType').isIn(['LPG', 'CNG']).withMessage('Invalid cylinder type'),
  body('quantity').optional().isInt({ min: 1 }),
  body('message').optional().isLength({ max: 1000 }),
  body('latitude').isFloat().withMessage('Invalid latitude'),
  body('longitude').isFloat().withMessage('Invalid longitude'),
  body('address').trim().notEmpty().withMessage('Address is required'),
];

export const completeRequestValidation = [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('review').optional().isLength({ max: 1000 }),
];

export default new EmergencyRequestController();