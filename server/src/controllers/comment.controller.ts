import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';
import { createCommentSchema } from '../schemas/batch2.schemas';
import { applicationIdParamSchema } from '../schemas/application-management.schema';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const commentIdParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID'),
  commentId: z.string().uuid('Invalid comment ID')
});

export class CommentController {
  /**
   * POST /api/v1/applications/:applicationId/comments
   * Add comment to application with @mentions
   */
  static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = createCommentSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const comment = await CommentService.addComment(
        req.user! as any,
        paramParsed.data.applicationId,
        bodyParsed.data.content
      );

      res.status(201).json({
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId/comments
   * List all comments for an application
   */
  static async getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const comments = await CommentService.getComments(paramParsed.data.applicationId);
      res.status(200).json({
        data: comments,
        count: comments.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/applications/:applicationId/comments/:commentId
   * Delete comment (author or Manager)
   */
  static async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = commentIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await CommentService.deleteComment(
        req.user!,
        paramParsed.data.commentId
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
