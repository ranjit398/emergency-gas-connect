import express, { Router, Request, Response } from 'express';
import messageController, { sendMessageValidation } from './controllers/MessageController';
import { authMiddleware } from './middleware/auth';
import { validateChatAccess } from './middleware/chatAuth.middleware';
import { validate } from './middleware/validation';
import { asyncHandler } from './middleware/index';
import chatService from './services/chat.service';
import { success, paginated } from './utils/response';

const router: Router = express.Router();
router.use(authMiddleware);

// ── EXISTING routes (unchanged) ──────────────────────────────────────────────
router.post('/', validate(sendMessageValidation), messageController.sendMessage);
router.get('/conversation', messageController.getConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.put('/:id/mark-read', messageController.markAsRead);
router.delete('/:id', messageController.deleteMessage);

router.get('/request/:requestId', messageController.getMessages);


router.get('/chat/:requestId', validateChatAccess, asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const page  = parseInt(req.query.page  as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const result = await chatService.getHistory(requestId, page, limit);

  res.json({
    success: true,
    data: result.messages,
    pagination: {
      page,
      limit,
      total: result.total,
      hasMore: result.hasMore,
    },
  });
}));


router.put('/chat/:requestId/read', validateChatAccess, asyncHandler(async (req: Request, res: Response) => {
  const count = await chatService.markAllRead(req.params.requestId, req.userId!);
  res.json(success({ markedRead: count }, `${count} messages marked as read`));
}));


router.get('/unread-by-conversation', asyncHandler(async (req: Request, res: Response) => {
  const map = await chatService.getUnreadByConversation(req.userId!);
  res.json(success(map));
}));

export default router;