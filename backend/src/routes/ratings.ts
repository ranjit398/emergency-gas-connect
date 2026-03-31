import express, { Router } from 'express';
import ratingController, {
  createRatingValidation,
} from '@controllers/RatingController';
import { authMiddleware } from '@middleware/auth';
import { validate } from '@middleware/validation';

const router: Router = express.Router();

router.get('/user/:userId', ratingController.getUserRatings);
router.get('/user/:userId/average', ratingController.getAverageRating);
router.get('/provider/:providerId', ratingController.getProviderRatings);
router.get('/provider/:providerId/average', ratingController.getProviderAverageRating);

router.use(authMiddleware);

router.post(
  '/',
  validate(createRatingValidation),
  ratingController.createRating
);

export default router;
