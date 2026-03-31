import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'request_created'
  | 'request_accepted'
  | 'request_completed'
  | 'message_received'
  | 'rating_received'
  | 'verification_status'
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'request_created',
        'request_accepted',
        'request_completed',
        'message_received',
        'rating_received',
        'verification_status',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Create indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<INotification>(
  'Notification',
  notificationSchema,
  'notifications'
);
