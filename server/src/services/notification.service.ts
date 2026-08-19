import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { RecipientType } from '@prisma/client';
import { ListNotificationsInput } from '../schemas/notification.schema';

export class NotificationService {
  /**
   * List notifications addressed to the authenticated User.
   * Scoped strictly to recipientType = User AND recipientId = actorId.
   */
  static async listNotifications(actorId: string, filters: ListNotificationsInput) {
    const where: {
      recipientType: RecipientType;
      recipientId: string;
      type?: ListNotificationsInput['type'];
    } = {
      recipientType: RecipientType.User,
      recipientId: actorId
    };

    if (filters.type) {
      where.type = filters.type;
    }

    return prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
      select: {
        id: true,
        applicationId: true,
        recipientType: true,
        recipientId: true,
        type: true,
        channel: true,
        sentAt: true
      }
    });
  }

  /**
   * Retrieve single notification by ID.
   * Strictly enforces that the notification belongs to the authenticated user.
   */
  static async getNotificationById(actorId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        applicationId: true,
        recipientType: true,
        recipientId: true,
        type: true,
        channel: true,
        sentAt: true
      }
    });

    if (!notification || notification.recipientType !== RecipientType.User || notification.recipientId !== actorId) {
      throw new AppError(404, 'Notification not found.');
    }

    return notification;
  }
}
