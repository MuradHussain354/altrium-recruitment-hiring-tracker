import { Request, Response, NextFunction } from 'express';
import { JobAlertService } from '../services/job-alert.service';
import { jobAlertSubscriptionSchema, unsubscribeJobAlertSchema } from '../schemas/job-alert.schema';
import { AppError } from '../utils/errors';

export class JobAlertController {
  /**
   * POST /api/v1/public/job-alerts (Public Job Alert Subscription)
   */
  static async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = jobAlertSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const subscription = await JobAlertService.subscribe(parsed.data);

      res.status(201).json({
        message: 'Successfully subscribed to job alerts.',
        data: subscription
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/public/job-alerts/unsubscribe
   */
  static async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.body?.token;

      const parsed = unsubscribeJobAlertSchema.safeParse({ token });
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const result = await JobAlertService.unsubscribe(parsed.data.token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
