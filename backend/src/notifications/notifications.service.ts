import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

interface CreateNotificationDto {
  recipient: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    return this.notificationModel.create({
      recipient: new Types.ObjectId(dto.recipient),
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data ?? null,
    });
  }

  async getForUser(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [data, total, unread] = await Promise.all([
      this.notificationModel
        .find({ recipient: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments({ recipient: new Types.ObjectId(userId) }),
      this.notificationModel.countDocuments({
        recipient: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    return { data, total, unread, page, limit, hasMore: skip + limit < total };
  }

  async markRead(userId: string, notificationId: string) {
    await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), recipient: new Types.ObjectId(userId) },
      { isRead: true },
    );
    return { message: 'Notification marked as read' };
  }

  async markAllRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead: false,
    });
  }
}
