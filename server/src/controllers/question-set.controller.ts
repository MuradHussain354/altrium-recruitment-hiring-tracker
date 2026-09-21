import { Request, Response, NextFunction } from 'express';
import { QuestionSetService } from '../services/question-set.service';
import { createQuestionSetSchema, updateQuestionSetSchema } from '../schemas/batch2.schemas';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const questionSetIdParamSchema = z.object({
  id: z.string().uuid('Invalid question set ID')
});

const duplicateSchema = z.object({
  title: z.string().trim().min(1).max(150).optional()
});

export class QuestionSetController {
  /**
   * POST /api/v1/question-sets
   * HR & Manager: Create reusable question set
   */
  static async createQuestionSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createQuestionSetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const qs = await QuestionSetService.createQuestionSet(req.user!.id, parsed.data);
      res.status(201).json({
        data: qs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/question-sets
   * HR, TeamLead, Manager: List question sets
   */
  static async getQuestionSets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const sets = await QuestionSetService.getQuestionSets(category);
      res.status(200).json({
        data: sets,
        count: sets.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/question-sets/:id
   * Get single question set with questions
   */
  static async getQuestionSetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = questionSetIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const qs = await QuestionSetService.getQuestionSetById(paramParsed.data.id);
      res.status(200).json({
        data: qs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/question-sets/:id
   * HR & Manager: Update question set (historical integrity enforced)
   */
  static async updateQuestionSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = questionSetIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = updateQuestionSetSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const updated = await QuestionSetService.updateQuestionSet(
        paramParsed.data.id,
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
   * POST /api/v1/question-sets/:id/duplicate
   * Duplicate a question set (creates a safe copy to edit when original is in use)
   */
  static async duplicateQuestionSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = questionSetIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = duplicateSchema.safeParse(req.body);
      const newTitle = bodyParsed.success ? bodyParsed.data.title : undefined;

      const duplicated = await QuestionSetService.duplicateQuestionSet(
        req.user!.id,
        paramParsed.data.id,
        newTitle
      );

      res.status(201).json({
        data: duplicated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/question-sets/:id
   * Delete unused question set
   */
  static async deleteQuestionSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = questionSetIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await QuestionSetService.deleteQuestionSet(paramParsed.data.id);
      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
