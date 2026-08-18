import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { candidateApplicationSchema } from '../schemas/application.schema';
import { AppError } from '../utils/errors';

export class ApplicationController {
  /**
   * POST /api/v1/public/applications (Public Candidate Submission)
   */
  static async submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = candidateApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const application = await ApplicationService.submitApplication(parsed.data);
      res.status(201).json({
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }
}
