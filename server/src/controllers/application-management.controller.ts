import { Request, Response, NextFunction } from 'express';
import { ApplicationManagementService } from '../services/application-management.service';
import { TeamAssignmentService } from '../services/team-assignment.service';
import {
  listApplicationsSchema,
  applicationIdParamSchema,
  changeStageSchema,
  changeStatusSchema
} from '../schemas/application-management.schema';
import { assignTeamBodySchema, teamApplicationParamSchema } from '../schemas/team-assignment.schema';
import { AppError } from '../utils/errors';

export class ApplicationManagementController {
  /**
   * GET /api/v1/applications
   * HR & Manager: list applications with optional filters
   */
  static async listApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = listApplicationsSchema.safeParse(req.query);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const applications = await ApplicationManagementService.listApplications(parsed.data);
      res.status(200).json({
        data:  applications,
        count: applications.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId
   * HR & Manager: application detail view
   */
  static async getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        const message = paramParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const application = await ApplicationManagementService.getApplicationById(paramParsed.data.applicationId);
      res.status(200).json({
        data: application
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/applications/:applicationId/stage
   * HR only: move application to another stage within the same position
   */
  static async moveStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        const message = paramParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const bodyParsed = changeStageSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const message = bodyParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const application = await ApplicationManagementService.moveApplicationStage(
        req.user!.id,
        paramParsed.data.applicationId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Application stage updated successfully',
        data:    application
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/applications/:applicationId/status
   * HR only: update overall application status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        const message = paramParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const bodyParsed = changeStatusSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const message = bodyParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const application = await ApplicationManagementService.updateApplicationStatus(
        req.user!.id,
        paramParsed.data.applicationId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Application status updated successfully',
        data:    application
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/applications/:applicationId/team
   * HR only: assign a Team to an Application
   */
  static async assignTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = teamApplicationParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        const message = paramParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const bodyParsed = assignTeamBodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const message = bodyParsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const application = await TeamAssignmentService.assignTeam(
        req.user!.id,
        paramParsed.data.applicationId,
        bodyParsed.data
      );

      res.status(200).json({
        message: 'Team assigned successfully',
        data:    application
      });
    } catch (error) {
      next(error);
    }
  }
}
