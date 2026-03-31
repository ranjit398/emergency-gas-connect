import Message, { IMessage } from './models/Message';
import { NotFoundError } from './middleware/errorHandler';
import mongoose from 'mongoose';

export class MessageService {
  async sendMessage(
    requestId: string,
    senderId: string,
    receiverId: string,
    content: string,
    attachments: string[] = []
  ): Promise<IMessage> {
    return Message.create({
      requestId,
      senderId,
      receiverId,
      content,
      attachments,
    });
  }

  async getMessages(
    requestId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: IMessage[]; total: number }> {
    // Validate requestId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new Error('Invalid request ID');
    }

    const skip = (page - 1) * limit;

    try {
      const [messages, total] = await Promise.all([
        Message.find({ requestId: new mongoose.Types.ObjectId(requestId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'email fullName avatarUrl')
          .populate('receiverId', 'email fullName avatarUrl'),
        Message.countDocuments({ requestId: new mongoose.Types.ObjectId(requestId) }),
      ]);

      // @ts-ignore - Mongoose types conflict
      return { messages, total };
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return empty array if there's an error, allowing chat to work with socket-only
      return { messages: [], total: 0 };
    }
  }

  async getConversation(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ messages: IMessage[]; total: number }> {
    // Validate userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const skip = (page - 1) * limit;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
      const [messages, total] = await Promise.all([
        Message.find({
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('senderId', 'email fullName avatarUrl')
          .populate('receiverId', 'email fullName avatarUrl'),
        Message.countDocuments({
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        }),
      ]);

      // @ts-ignore - Mongoose types conflict
      return { messages, total };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return { messages: [], total: 0 };
    }
  }

  async markAsRead(messageId: string): Promise<IMessage> {
    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    return message;
  }

  async markRequestMessagesAsRead(requestId: string, userId: string): Promise<void> {
    await Message.updateMany(
      {
        requestId,
        receiverId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Message.countDocuments({
      receiverId: userId,
      isRead: false,
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    const result = await Message.findByIdAndDelete(messageId);
    if (!result) {
      throw new NotFoundError('Message not found');
    }
  }
}

export default new MessageService();
