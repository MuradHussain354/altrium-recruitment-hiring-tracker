import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { listNotificationsSchema, notificationIdParamSchema, idParamSchema } from '../schemas/notification.schema';
import { AppError } from '../utils/errors';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Authenticated user: retrieve notifications addressed to self
   */
  static async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryParsed = listNotificationsSchema.safeParse(req.query);
      if (!queryParsed.success) {
        throw new AppError(400, queryParsed.error.errors.map((e) => e.message).join(', '));
      }

      const notifications = await NotificationService.listNotifications(
        req.user!.id,
        queryParsed.data
      );

      res.status(200).json({
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Authenticated user: retrieve unread notifications count
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unreadCount = await NotificationService.getUnreadCount(req.user!.id);

      res.status(200).json({
        data: { unreadCount },
        unreadCount
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Authenticated user: mark all unread notifications as read
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);

      res.status(200).json({
        data: result,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Authenticated user: mark single notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = idParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const notification = await NotificationService.markAsRead(
        req.user!.id,
        paramParsed.data.id
      );

      res.status(200).json({
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/:notificationId
   * Authenticated user: retrieve single notification addressed to self
   */
  static async getNotificationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = notificationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const notification = await NotificationService.getNotificationById(
        req.user!.id,
        paramParsed.data.notificationId
      );

      res.status(200).json({
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }
}
