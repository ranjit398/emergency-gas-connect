import express, { Router } from 'express';
import providerController, {
  createProviderValidation,
  updateProviderValidation,
} from './controllers/ProviderController';
import { authMiddleware, requireRole } from './middleware/auth';
import { validate } from './middleware/validation';

const router: Router = express.Router();

router.get('/nearby', providerController.getNearbyProviders);
router.get('/search', providerController.searchProviders);
router.get('/top', providerController.getTopProviders);
router.get('/:id', providerController.getProvider);

router.use(authMiddleware);

router.post(
  '/',
  requireRole('provider'),
  validate(createProviderValidation),
  providerController.createProvider
);
router.get('/me', requireRole('provider'), providerController.getMyProvider);
router.put(
  '/me',
  requireRole('provider'),
  validate(updateProviderValidation),
  providerController.updateProvider
);

export default router;
