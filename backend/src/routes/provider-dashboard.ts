// backend/src/routes/providerDashboard.routes.ts
// Add to server.ts: v1.use('/provider', providerDashboardRoutes);

import express, { Router } from 'express';
import ctrl, { updateInventoryValidation } from '@controllers/providerDashboard.controller';
import { authMiddleware, requireRole } from '@middleware/auth';
import { validate } from '@middleware/validation';

const router: Router = express.Router();
router.use(authMiddleware);
router.use(requireRole('provider'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/requests', ctrl.getRequests);
router.get('/helpers', ctrl.getHelpers);
router.get('/inventory', ctrl.getInventory);
router.put('/inventory', validate(updateInventoryValidation), ctrl.updateInventory);
router.get('/activity', ctrl.getActivity);
router.get('/insights', ctrl.getInsights);

export default router;