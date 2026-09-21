import { Request, Response, NextFunction } from 'express';
import { ApplicationNoteService } from '../services/application-note.service';
import { createInternalNoteSchema } from '../schemas/batch2.schemas';
import { applicationIdParamSchema } from '../schemas/application-management.schema';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const noteIdParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID'),
  noteId: z.string().uuid('Invalid note ID')
});

export class ApplicationNoteController {
  /**
   * POST /api/v1/applications/:applicationId/notes
   * HR & Manager: Add internal note
   */
  static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const bodyParsed = createInternalNoteSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        throw new AppError(400, bodyParsed.error.errors.map((e) => e.message).join(', '));
      }

      const note = await ApplicationNoteService.addNote(
        req.user!,
        paramParsed.data.applicationId,
        bodyParsed.data.content
      );

      res.status(201).json({
        data: note
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/:applicationId/notes
   * HR & Manager: List internal notes
   */
  static async getNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = applicationIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const notes = await ApplicationNoteService.getNotes(
        req.user!,
        paramParsed.data.applicationId
      );

      res.status(200).json({
        data: notes,
        count: notes.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/applications/:applicationId/notes/:noteId
   * Author or Manager: Delete internal note
   */
  static async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const paramParsed = noteIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        throw new AppError(400, paramParsed.error.errors.map((e) => e.message).join(', '));
      }

      const result = await ApplicationNoteService.deleteNote(
        req.user!,
        paramParsed.data.noteId
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
