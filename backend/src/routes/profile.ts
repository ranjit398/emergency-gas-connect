import express, { Router } from 'express';
import profileController, {
  updateProfileValidation,
  updateLocationValidation,
  setAvailabilityValidation,
} from './controllers/ProfileController';
import { authMiddleware } from './middleware/auth';
import { validate } from './middleware/validation';

const router: Router = express.Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileValidation), profileController.updateProfile);
router.put('/location', validate(updateLocationValidation), profileController.updateLocation);
router.put('/availability', validate(setAvailabilityValidation), profileController.setAvailability);
router.get('/nearby-helpers', profileController.getNearbyHelpers);
router.get('/search', profileController.searchProfiles);

export default router;
