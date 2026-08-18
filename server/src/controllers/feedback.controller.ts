import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../services/feedback.service';
import {
  interviewFeedbackParamSchema,
  submitFeedbackSchema
} from '../schemas/feedback.schema';
import { AppError } from '../utils/errors';

export class FeedbackController {
  /**
   * POST /api/v1/interviews/:interviewId/feedback
   * TeamLead only (must be assigned): submit interview feedback
   */
  static async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewFeedbackParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = submitFeedbackSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const feedback = await FeedbackService.submitFeedback(
        { id: req.user!.id, role: req.user!.role },
        paramParsed.data.interviewId,
        bodyParsed.data
      );

      res.status(201).json({
        message: 'Feedback submitted successfully',
        data:    feedback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/interviews/:interviewId/feedback
   * HR, Manager, TeamLead (scoped): retrieve feedback for interview
   */
  static async getFeedbacks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewFeedbackParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const feedbacks = await FeedbackService.getFeedbacksForInterview(
        { id: req.user!.id, role: req.user!.role },
        paramParsed.data.interviewId
      );

      res.status(200).json({
        data:  feedbacks,
        count: feedbacks.length
      });
    } catch (error) {
      next(error);
    }
  }
}
