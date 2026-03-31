import Notification from './models/Notification';
import { NotificationType } from './models/Notification';

export class NotificationService {
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ): Promise<any> {
    return Notification.create({
      userId,
      type,
      title,
      message,
      data,
    });
  }

  async getNotifications(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ notifications: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId }),
    ]);

    return { notifications, total };
  }

  async getUnreadNotifications(userId: string): Promise<any[]> {
    return Notification.find({
      userId,
      isRead: false,
    }).sort({ createdAt: -1 });
  }

  async markAsRead(notificationId: string): Promise<any> {
    return Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<any> {
    return Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await Notification.findByIdAndDelete(notificationId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId,
      isRead: false,
    });
  }

  // Notification helpers
  async notifyRequestCreated(
    seekerId: string,
    requestId: string,
    address: string
  ): Promise<void> {
    await this.createNotification(
      seekerId,
      'request_created',
      'Request Created',
      `Your emergency request for ${address} has been created`,
      { requestId, address }
    );
  }

  async notifyRequestAccepted(
    seekerId: string,
    helperId: string,
    requestId: string,
    helperName: string
  ): Promise<void> {
    await this.createNotification(
      seekerId,
      'request_accepted',
      'Request Accepted',
      `${helperName} has accepted your request`,
      { requestId, helperId, helperName }
    );
  }

  async notifyRequestCompleted(
    seekerId: string,
    requestId: string
  ): Promise<void> {
    await this.createNotification(
      seekerId,
      'request_completed',
      'Request Completed',
      'Your gas request has been completed',
      { requestId }
    );
  }

  async notifyMessageReceived(
    receiverId: string,
    requestId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      'message_received',
      'New Message',
      `${senderName}: ${messagePreview.substring(0, 50)}...`,
      { requestId, senderName }
    );
  }

  async notifyRatingReceived(
    userId: string,
    rating: number,
    senderName: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'rating_received',
      'New Rating',
      `${senderName} rated you ${rating} stars`,
      { rating, senderName }
    );
  }

  async notifyVerificationStatus(
    userId: string,
    status: 'verified' | 'rejected',
    message: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'verification_status',
      `Verification ${status}`,
      message,
      { status }
    );
  }
}

export default new NotificationService();
