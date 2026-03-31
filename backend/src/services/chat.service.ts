// backend/src/services/chat.service.ts
// NEW FILE — slot into backend/src/services/
// Handles message persistence and retrieval for real-time chat

import mongoose from 'mongoose';
import Message, { IMessage } from './models/Message';
import Profile from './models/Profile';
import User from './models/User';
import { NotFoundError } from './middleware/errorHandler';
import logger from './utils/logger';

// ── Conversation participant lookup pipeline ──────────────────────────────────
// Joins Profile for fullName since it's not in User
const MESSAGE_SENDER_PIPELINE = [
  {
    $lookup: {
      from: 'profiles',
      localField: 'senderId',
      foreignField: 'userId',
      as: '_senderProfile',
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'senderId',
      foreignField: '_id',
      as: '_senderUser',
    },
  },
  {
    $addFields: {
      sender: {
        $let: {
          vars: {
            sp: { $arrayElemAt: ['$_senderProfile', 0] },
            su: { $arrayElemAt: ['$_senderUser', 0] },
          },
          in: {
            id: { $toString: '$senderId' },
            email: '$$su.email',
            fullName: '$$sp.fullName',
            avatarUrl: '$$sp.avatarUrl',
          },
        },
      },
      id: { $toString: '$_id' },
    },
  },
  { $project: { _senderProfile: 0, _senderUser: 0 } },
];

export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export class ChatService {

  // ── Save a message to MongoDB ────────────────────────────────────────────
  async saveMessage(params: {
    requestId: string;
    senderId: string;
    receiverId: string;
    content: string;
    attachments?: string[];
  }): Promise<ChatMessage> {
    const message = await Message.create({
      requestId: new mongoose.Types.ObjectId(params.requestId),
      senderId:  new mongoose.Types.ObjectId(params.senderId),
      receiverId: new mongoose.Types.ObjectId(params.receiverId),
      content: params.content.trim(),
      attachments: params.attachments ?? [],
      isRead: false,
    });

    logger.debug(`[Chat] Message saved: ${message._id} in request ${params.requestId}`);

    // Return enriched message
    return this.enrichMessage(message);
  }

  // ── Fetch conversation history for a request ─────────────────────────────
  async getHistory(
    requestId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: ChatMessage[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Message.aggregate([
        { $match: { requestId: new mongoose.Types.ObjectId(requestId) } },
        { $sort: { createdAt: -1 } }, // newest first for pagination
        { $skip: skip },
        { $limit: limit },
        ...MESSAGE_SENDER_PIPELINE,
      ]),
      Message.countDocuments({ requestId: new mongoose.Types.ObjectId(requestId) }),
    ]);

    // Reverse to chronological order for display
    const messages: ChatMessage[] = results.reverse().map((m: any) => ({
      id: m.id ?? m._id?.toString(),
      requestId: m.requestId?.toString(),
      senderId: m.senderId?.toString(),
      receiverId: m.receiverId?.toString(),
      content: m.content,
      attachments: m.attachments ?? [],
      isRead: m.isRead,
      readAt: m.readAt?.toISOString() ?? null,
      createdAt: m.createdAt?.toISOString(),
      sender: m.sender ? {
        id: m.sender.id,
        email: m.sender.email,
        fullName: m.sender.fullName ?? m.sender.email?.split('@')[0] ?? 'User',
        avatarUrl: m.sender.avatarUrl ?? null,
      } : undefined,
    }));

    return { messages, total, hasMore: skip + limit < total };
  }

  // ── Mark all messages in a conversation as read ──────────────────────────
  async markAllRead(requestId: string, userId: string): Promise<number> {
    const result = await Message.updateMany(
      {
        requestId: new mongoose.Types.ObjectId(requestId),
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );
    return result.modifiedCount;
  }

  // ── Count unread messages for a user ────────────────────────────────────
  async getUnreadCount(userId: string): Promise<number> {
    return Message.countDocuments({
      receiverId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  // ── Get unread per-conversation counts ──────────────────────────────────
  async getUnreadByConversation(userId: string): Promise<Record<string, number>> {
    const result = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$requestId',
          count: { $sum: 1 },
        },
      },
    ]);

    const map: Record<string, number> = {};
    result.forEach((r) => { map[r._id.toString()] = r.count; });
    return map;
  }

  // ── Enrich a Message document with sender info ───────────────────────────
  private async enrichMessage(message: IMessage): Promise<ChatMessage> {
    const [profile, user] = await Promise.all([
      Profile.findOne({ userId: message.senderId }).select('fullName avatarUrl').lean(),
      User.findById(message.senderId).select('email').lean(),
    ]);

    return {
      id: (message._id as any).toString(),
      requestId: message.requestId.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      content: message.content,
      attachments: message.attachments ?? [],
      isRead: message.isRead,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: (message as any).createdAt?.toISOString(),
      sender: {
        id: message.senderId.toString(),
        email: (user as any)?.email ?? '',
        fullName: (profile as any)?.fullName ?? (user as any)?.email?.split('@')[0] ?? 'User',
        avatarUrl: (profile as any)?.avatarUrl ?? null,
      },
    };
  }
}

export default new ChatService();