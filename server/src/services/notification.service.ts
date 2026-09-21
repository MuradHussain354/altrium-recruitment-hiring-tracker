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
        interviewId: true,
        recipientType: true,
        recipientId: true,
        type: true,
        channel: true,
        isRead: true,
        readAt: true,
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
        interviewId: true,
        recipientType: true,
        recipientId: true,
        type: true,
        channel: true,
        isRead: true,
        readAt: true,
        sentAt: true
      }
    });

    if (!notification || notification.recipientType !== RecipientType.User || notification.recipientId !== actorId) {
      throw new AppError(404, 'Notification not found.');
    }

    return notification;
  }

  /**
   * Count unread notifications addressed to the authenticated User.
   */
  static async getUnreadCount(actorId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        recipientType: RecipientType.User,
        recipientId: actorId,
        isRead: false
      }
    });
  }

  /**
   * Mark a single notification as read.
   * Strictly enforces ownership: recipientType = User AND recipientId = actorId.
   * If notification does not belong to authenticated user, throws 404 AppError.
   * Safe and idempotent if already read.
   */
  static async markAsRead(actorId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.recipientType !== RecipientType.User || notification.recipientId !== actorId) {
      throw new AppError(404, 'Notification not found.');
    }

    if (notification.isRead) {
      return prisma.notification.findUnique({
        where: { id: notificationId },
        select: {
          id: true,
          applicationId: true,
          interviewId: true,
          recipientType: true,
          recipientId: true,
          type: true,
          channel: true,
          isRead: true,
          readAt: true,
          sentAt: true
        }
      });
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      },
      select: {
        id: true,
        applicationId: true,
        interviewId: true,
        recipientType: true,
        recipientId: true,
        type: true,
        channel: true,
        isRead: true,
        readAt: true,
        sentAt: true
      }
    });
  }

  /**
   * Mark all unread notifications belonging to the authenticated User as read.
   * Safe to call repeatedly (idempotent).
   */
  static async markAllAsRead(actorId: string): Promise<{ count: number }> {
    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        recipientType: RecipientType.User,
        recipientId: actorId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: now
      }
    });

    return { count: result.count };
  }
}
