import { Request, Response, NextFunction } from 'express';
import { SavedFilterService } from '../services/saved-filter.service';
import { createSavedFilterSchema, updateSavedFilterSchema } from '../schemas/batch2.schemas';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const filterIdParamSchema = z.object({
  filterId: z.string().uuid('Invalid filter ID')
});

export class SavedFilterController {
  /**
   * POST /api/v1/saved-filters
   * Create private saved filter
   */
  static async createFilter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createSavedFilterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const filter = await SavedFilterService.createFilter(req.user!.id, parsed.data);
      res.status(201).json({
        data: filter
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/saved-filters
   * List current user's saved filters
   */
  static async getMyFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = await SavedFilterService.getMyFilters(req.user!.id);
      res.status(200).json({
        data: filters,
        count: filters.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/saved-filters/:filterId
   * Update saved filter (ownership verified)
   */
  static async updateFilter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = filterIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = updateSavedFilterSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const updated = await SavedFilterService.updateFilter(
        req.user!.id,
        paramParsed.data.filterId,
        bodyParsed.data
      );

      res.status(200).json({
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/saved-filters/:filterId
   * Delete saved filter (ownership verified)
   */
  static async deleteFilter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = filterIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await SavedFilterService.deleteFilter(
        req.user!.id,
        paramParsed.data.filterId
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
