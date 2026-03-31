import express, { Router } from 'express';
import { authMiddleware } from '@middleware/auth';
import { asyncHandler } from '@middleware/index';
import notificationService from '@services/NotificationService';
import { success, paginated } from '@utils/response';

const router: Router = express.Router();
router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { notifications, total } = await notificationService.getNotifications(
    req.userId!,
    parseInt(page as string),
    parseInt(limit as string)
  );
  res.json(paginated(notifications, parseInt(page as string), parseInt(limit as string), total));
}));

router.get('/unread', asyncHandler(async (req, res) => {
  const notifications = await notificationService.getUnreadNotifications(req.userId!);
  res.json(success(notifications));
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.userId!);
  res.json(success({ count }));
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id);
  res.json(success(notification, 'Marked as read'));
}));

router.put('/read-all', asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.userId!);
  res.json(success(null, 'All notifications marked as read'));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.params.id);
  res.json(success(null, 'Notification deleted'));
}));

export default router;