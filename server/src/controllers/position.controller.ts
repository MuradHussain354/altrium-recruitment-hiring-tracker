import { Request, Response, NextFunction } from 'express';
import { PositionService } from '../services/position.service';
import {
  createPositionSchema,
  updatePositionSchema,
  updatePositionStatusSchema,
  publicPositionQuerySchema
} from '../schemas/position.schema';
import { AppError } from '../utils/errors';

export class PositionController {
  /**
   * POST /api/v1/positions (HR Only)
   */
  static async createPosition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPositionSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const position = await PositionService.createPosition(req.user!.id, parsed.data);
      res.status(201).json({
        message: 'Position created successfully',
        data: position
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/positions (HR & Manager)
   */
  static async getPositions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        status: req.query.status as any,
        department: req.query.department as string,
        search: req.query.search as string
      };

      const positions = await PositionService.getPositions(query);
      res.status(200).json({
        data: positions,
        count: positions.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/positions/:id (HR & Manager)
   */
  static async getPositionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const position = await PositionService.getPositionById(id);
      res.status(200).json({
        data: position
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/positions/:id (HR Only)
   */
  static async updatePosition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updatePositionSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const position = await PositionService.updatePosition(req.user!.id, id, parsed.data);
      res.status(200).json({
        message: 'Position updated successfully',
        data: position
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/positions/:id/status (HR Only)
   */
  static async updatePositionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updatePositionStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const position = await PositionService.updatePositionStatus(req.user!.id, id, parsed.data.status);
      res.status(200).json({
        message: 'Position status updated successfully',
        data: position
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/positions (Public)
   */
  static async getPublicPositions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = publicPositionQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const positions = await PositionService.getPublicPositions(parsed.data);
      res.status(200).json({
        data: positions,
        count: positions.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/positions/:id (Public)
   */
  static async getPublicPositionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const position = await PositionService.getPublicPositionById(id);
      res.status(200).json({
        data: position
      });
    } catch (error) {
      next(error);
    }
  }
}
