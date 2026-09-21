import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interview.service';
import {
  createInterviewSchema,
  updateInterviewSchema,
  updateInterviewStatusSchema,
  updateInterviewersSchema,
  listInterviewsSchema,
  interviewApplicationParamSchema,
  interviewIdParamSchema
} from '../schemas/interview.schema';
import { AppError } from '../utils/errors';

export class InterviewController {
  /**
   * POST /api/v1/applications/:applicationId/interviews
   * HR only: schedule a new interview
   */
  static async createInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewApplicationParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = createInterviewSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const interview = await InterviewService.createInterview(
        req.user!.id,
        paramParsed.data.applicationId,
        bodyParsed.data
      );

      res.status(201).json({
        message: 'Interview scheduled successfully',
        data:    interview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/interviews
   * HR, Manager, TeamLead (scoped): list interviews with optional filters
   */
  static async listInterviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listInterviewsSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const interviews = await InterviewService.listInterviews(
        { id: req.user!.id, role: req.user!.role },
        parsed.data
      );

      res.status(200).json({
        data:  interviews,
        count: interviews.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/interviews/:interviewId
   * HR, Manager, TeamLead (assigned only): interview detail
   */
  static async getInterviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const interview = await InterviewService.getInterviewById(
        { id: req.user!.id, role: req.user!.role },
        paramParsed.data.interviewId
      );

      res.status(200).json({ data: interview });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/interviews/:interviewId
   * HR only: update schedule/location/meetingLink
   */
  static async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = updateInterviewSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const interview = await InterviewService.updateInterview(
        req.user!.id,
        paramParsed.data.interviewId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Interview updated successfully',
        data:    interview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/interviews/:interviewId/status
   * HR only: update interview status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = updateInterviewStatusSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const interview = await InterviewService.updateInterviewStatus(
        req.user!.id,
        paramParsed.data.interviewId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Interview status updated successfully',
        data:    interview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/interviews/:interviewId/interviewers
   * HR only: replace all interviewers (full replace semantics)
   */
  static async updateInterviewers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = updateInterviewersSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const interview = await InterviewService.updateInterviewers(
        req.user!.id,
        paramParsed.data.interviewId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Interview interviewers updated successfully',
        data:    interview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/interviews/:interviewId/respond
   * TeamLead: Accept or decline interview invitation
   */
  static async respondToInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const { status, declineReason } = req.body;
      if (!status || !['Accepted', 'Declined'].includes(status)) {
        throw new AppError(400, 'Status must be Accepted or Declined.');
      }

      if (status === 'Declined' && (!declineReason || typeof declineReason !== 'string' || declineReason.trim().length === 0)) {
        throw new AppError(400, 'A decline reason is required when declining an invitation.');
      }

      const result = await InterviewService.respondToInvitation(
        req.user!,
        paramParsed.data.interviewId,
        status,
        declineReason
      );

      res.status(200).json({
        message: `Invitation ${status.toLowerCase()} successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/interviews/:interviewId/delegate
   * TeamLead: Delegate interview assignment to another eligible interviewer
   */
  static async delegateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const { targetInterviewerId } = req.body;
      if (!targetInterviewerId || typeof targetInterviewerId !== 'string') {
        throw new AppError(400, 'targetInterviewerId is required');
      }

      const result = await InterviewService.delegateInterview(
        req.user!,
        paramParsed.data.interviewId,
        targetInterviewerId
      );

      res.status(200).json({
        message: 'Interview delegated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/interviews/my-history
   * TeamLead: List historical interviews conducted by the authenticated interviewer
   */
  static async getMyHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, from, to } = req.query;
      const history = await InterviewService.getMyInterviewHistory(req.user!, {
        status: status as any,
        from: from ? new Date(String(from)) : undefined,
        to: to ? new Date(String(to)) : undefined
      });

      res.status(200).json({
        data: history,
        count: history.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId/consolidated-feedback
   * HR, TeamLead, Manager: Consolidated multi-interviewer feedback and deterministic scorecard
   */
  static async getConsolidatedFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = interviewApplicationParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const consolidated = await InterviewService.getConsolidatedFeedback(req.user!, paramParsed.data.applicationId);

      res.status(200).json({
        data: consolidated
      });
    } catch (error) {
      next(error);
    }
  }
}
