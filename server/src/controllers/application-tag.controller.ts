import { Request, Response, NextFunction } from 'express';
import { ApplicationTagService } from '../services/application-tag.service';
import { createTagSchema } from '../schemas/batch2.schemas';
import { applicationIdParamSchema } from '../schemas/application-management.schema';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const tagIdParamSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID')
});

export class ApplicationTagController {
  /**
   * POST /api/v1/applications/:applicationId/tags
   * HR & Manager: Add tag to application
   */
  static async addTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = createTagSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const tag = await ApplicationTagService.addTag(
        req.user!,
        paramParsed.data.applicationId,
        bodyParsed.data
      );

      res.status(201).json({
        data: tag
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/applications/:applicationId/tags/:tagId
   * HR & Manager: Remove tag from application
   */
  static async removeTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = tagIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await ApplicationTagService.removeTag(
        req.user!,
        paramParsed.data.tagId
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId/tags
   * List tags for an application
   */
  static async getTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const tags = await ApplicationTagService.getTags(paramParsed.data.applicationId);
      res.status(200).json({
        data: tags,
        count: tags.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/tags
   * List distinct tags system-wide
   */
  static async getAllDistinctTags(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tags = await ApplicationTagService.getAllDistinctTags();
      res.status(200).json({
        data: tags,
        count: tags.length
      });
    } catch (error) {
      next(error);
    }
  }
}
