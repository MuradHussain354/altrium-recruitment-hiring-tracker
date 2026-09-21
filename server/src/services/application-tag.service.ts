import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';
import { CreateTagInput } from '../schemas/batch2.schemas';

export class ApplicationTagService {
  /**
   * Add a tag to an application.
   * Restricted to HR and Manager.
   */
  static async addTag(
    actor: { id: string; role: Role },
    applicationId: string,
    input: CreateTagInput
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied. Only HR and Managers can tag applications.');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    const existing = await prisma.applicationTag.findUnique({
      where: {
        applicationId_name: {
          applicationId,
          name: input.name
        }
      }
    });

    if (existing) {
      throw new AppError(409, `Tag "${input.name}" is already assigned to this application.`);
    }

    const tag = await prisma.$transaction(async (tx) => {
      const createdTag = await tx.applicationTag.create({
        data: {
          applicationId,
          name: input.name,
          color: input.color || '#3B82F6'
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'APPLICATION_TAG_ADDED',
          entityType: 'ApplicationTag',
          entityId: createdTag.id,
          details: JSON.stringify({ applicationId, tagName: input.name })
        }
      });

      return createdTag;
    });

    return tag;
  }

  /**
   * Remove a tag from an application.
   * Restricted to HR and Manager.
   */
  static async removeTag(
    actor: { id: string; role: Role },
    tagId: string
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied. Only HR and Managers can remove tags.');
    }

    const tag = await prisma.applicationTag.findUnique({
      where: { id: tagId }
    });

    if (!tag) {
      throw new AppError(404, 'Tag not found.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.applicationTag.delete({
        where: { id: tagId }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'APPLICATION_TAG_REMOVED',
          entityType: 'ApplicationTag',
          entityId: tagId,
          details: JSON.stringify({ applicationId: tag.applicationId, tagName: tag.name })
        }
      });
    });

    return { success: true, message: 'Tag removed.' };
  }

  /**
   * Get all tags for an application.
   */
  static async getTags(applicationId: string) {
    return prisma.applicationTag.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get all unique tag names across the system for filter dropdowns.
   */
  static async getAllDistinctTags() {
    const tags = await prisma.applicationTag.findMany({
      select: { name: true, color: true },
      distinct: ['name'],
      orderBy: { name: 'asc' }
    });
    return tags;
  }
}
