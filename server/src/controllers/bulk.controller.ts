import { Request, Response, NextFunction } from 'express';
import { ApplicationManagementService } from '../services/application-management.service';
import { bulkStatusSchema, bulkStageSchema, bulkAssignTeamSchema } from '../schemas/batch2.schemas';
import { AppError } from '../utils/errors';

export class BulkController {
  /**
   * POST /api/v1/applications/bulk/status
   * HR & Manager: Bulk change status
   */
  static async bulkChangeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = bulkStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await ApplicationManagementService.bulkChangeStatus(
        req.user!.id,
        parsed.data.applicationIds,
        parsed.data.status,
        parsed.data.statusReason
      );
      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/applications/bulk/stage
   * HR only: Bulk change stage with per-application gating evaluation
   */
  static async bulkChangeStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = bulkStageSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await ApplicationManagementService.bulkChangeStage(
        req.user!.id,
        parsed.data.applicationIds,
        parsed.data.stageId
      );
      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/applications/bulk/team
   * HR only: Bulk assign team
   */
  static async bulkAssignTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = bulkAssignTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await ApplicationManagementService.bulkAssignTeam(
        req.user!.id,
        parsed.data.applicationIds,
        parsed.data.teamId
      );
      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
