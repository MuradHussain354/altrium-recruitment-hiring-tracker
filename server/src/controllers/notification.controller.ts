import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { listNotificationsSchema, notificationIdParamSchema } from '../schemas/notification.schema';
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
