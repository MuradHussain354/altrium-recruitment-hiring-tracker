import { Request, Response, NextFunction } from 'express';
import { StageService } from '../services/stage.service';
import {
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema
} from '../schemas/stage.schema';
import { AppError } from '../utils/errors';

export class StageController {
  /**
   * POST /api/v1/positions/:positionId/stages (HR Only)
   */
  static async createStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId } = req.params;
      const parsed = createStageSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const stage = await StageService.createStage(req.user!.id, positionId, parsed.data);
      res.status(201).json({
        message: 'Stage created successfully',
        data: stage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/positions/:positionId/stages (HR & Manager Oversight)
   */
  static async getStages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId } = req.params;
      const stages = await StageService.getStagesByPosition(positionId);
      res.status(200).json({
        data: stages,
        count: stages.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/positions/:positionId/stages/:stageId (HR & Manager Oversight)
   */
  static async getStageById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId, stageId } = req.params;
      const stage = await StageService.getStageById(positionId, stageId);
      res.status(200).json({
        data: stage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/positions/:positionId/stages/:stageId (HR Only)
   */
  static async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId, stageId } = req.params;
      const parsed = updateStageSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const stage = await StageService.updateStage(req.user!.id, positionId, stageId, parsed.data);
      res.status(200).json({
        message: 'Stage updated successfully',
        data: stage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/positions/:positionId/stages/reorder (HR Only)
   */
  static async reorderStages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId } = req.params;
      const parsed = reorderStagesSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const stages = await StageService.reorderStages(req.user!.id, positionId, parsed.data);
      res.status(200).json({
        message: 'Stages reordered successfully',
        data: stages
      });
    } catch (error) {
      next(error);
    }
  }
}
