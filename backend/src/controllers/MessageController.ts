import { Request, Response } from 'express';
import { body } from 'express-validator';
import messageService from '@services/MessageService';
import { asyncHandler } from '@middleware/index';
import { success, paginated } from '@utils/response';

export class MessageController {
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { requestId, receiverId, content, attachments } = req.body;

    const message = await messageService.sendMessage(
      requestId,
      req.userId!,
      receiverId,
      content,
      attachments
    );

    res.status(201).json(success(message, 'Message sent'));
  });

  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50 } = req.query;
    const { messages, total } = await messageService.getMessages(
      req.params.requestId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      paginated(
        messages,
        parseInt(page as string),
        parseInt(limit as string),
        total
      )
    );
  });

  getConversation = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const { messages, total } = await messageService.getConversation(
      req.userId!,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      paginated(
        messages,
        parseInt(page as string),
        parseInt(limit as string),
        total
      )
    );
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const message = await messageService.markAsRead(req.params.id);
    res.json(success(message, 'Message marked as read'));
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await messageService.getUnreadCount(req.userId!);
    res.json(success({ count }));
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    await messageService.deleteMessage(req.params.id);
    res.json(success(null, 'Message deleted'));
  });
}

export const sendMessageValidation = [
  body('requestId').isMongoId(),
  body('receiverId').isMongoId(),
  body('content').trim().notEmpty().isLength({ max: 5000 }),
  body('attachments').optional().isArray(),
];

export default new MessageController();
