import { Request, Response } from 'express';
import { body } from 'express-validator';
import ratingService from '@services/RatingService';
import { asyncHandler } from '@middleware/index';
import { success, paginated } from '@utils/response';

export class RatingController {
  createRating = asyncHandler(async (req: Request, res: Response) => {
    const { requestId, toUserId, providerId, rating, review } = req.body;

    const ratingDoc = await ratingService.createRating(
      requestId,
      req.userId!,
      toUserId,
      providerId,
      rating,
      review
    );

    res.status(201).json(success(ratingDoc, 'Rating created'));
  });

  getUserRatings = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { ratings, total } = await ratingService.getRatings(
      req.params.userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      paginated(
        ratings,
        parseInt(page as string),
        parseInt(limit as string),
        total
      )
    );
  });

  getProviderRatings = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { ratings, total } = await ratingService.getProviderRatings(
      req.params.providerId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      paginated(
        ratings,
        parseInt(page as string),
        parseInt(limit as string),
        total
      )
    );
  });

  getAverageRating = asyncHandler(async (req: Request, res: Response) => {
    const average = await ratingService.getAverageRating(req.params.userId);
    res.json(success({ average }));
  });

  getProviderAverageRating = asyncHandler(async (req: Request, res: Response) => {
    const average = await ratingService.getProviderAverageRating(
      req.params.providerId
    );
    res.json(success({ average }));
  });
}

export const createRatingValidation = [
  body('requestId').isMongoId(),
  body('toUserId').isMongoId(),
  body('providerId').optional().isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().isLength({ max: 1000 }),
];

export default new RatingController();
