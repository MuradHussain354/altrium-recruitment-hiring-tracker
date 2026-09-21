import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

export class ApplicationNoteService {
  /**
   * Add a private internal note to an application.
   * Strictly restricted to HR and Manager.
   */
  static async addNote(
    actor: { id: string; role: Role },
    applicationId: string,
    content: string
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied. Only HR and Managers can add internal notes.');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    const note = await prisma.$transaction(async (tx) => {
      const createdNote = await tx.applicationInternalNote.create({
        data: {
          applicationId,
          authorId: actor.id,
          content
        },
        include: {
          author: {
            select: { id: true, name: true, role: true }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'INTERNAL_NOTE_ADDED',
          entityType: 'ApplicationInternalNote',
          entityId: createdNote.id,
          details: JSON.stringify({ applicationId })
        }
      });

      return createdNote;
    });

    return note;
  }

  /**
   * List private internal notes for an application.
   * Strictly restricted to HR and Manager.
   */
  static async getNotes(
    actor: { id: string; role: Role },
    applicationId: string
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied. Only HR and Managers can view internal notes.');
    }

    const notes = await prisma.applicationInternalNote.findMany({
      where: { applicationId },
      include: {
        author: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return notes;
  }

  /**
   * Delete an internal note.
   * Author or Manager can delete.
   */
  static async deleteNote(
    actor: { id: string; role: Role },
    noteId: string
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied.');
    }

    const note = await prisma.applicationInternalNote.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      throw new AppError(404, 'Internal note not found.');
    }

    if (actor.role !== Role.Manager && note.authorId !== actor.id) {
      throw new AppError(403, 'Access denied. You can only delete your own notes.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.applicationInternalNote.delete({
        where: { id: noteId }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'INTERNAL_NOTE_DELETED',
          entityType: 'ApplicationInternalNote',
          entityId: noteId,
          details: JSON.stringify({ applicationId: note.applicationId })
        }
      });
    });

    return { success: true, message: 'Internal note deleted.' };
  }
}
