import prisma from '../config/prisma';
import { PositionStatus, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { CreatePositionInput, UpdatePositionInput, PublicPositionQueryInput } from '../schemas/position.schema';

export class PositionService {
  /**
   * HR creates a recruitment position record only (no automatic stages).
   */
  static async createPosition(actorId: string, input: CreatePositionInput) {
    const position = await prisma.position.create({
      data: {
        title: input.title,
        department: input.department,
        description: input.description,
        requiredSkills: input.requiredSkills,
        headcount: input.headcount ?? 1,
        status: input.status ?? PositionStatus.Draft,
        pipelineTemplateId: input.pipelineTemplateId,
        createdById: actorId
      },
      include: {
        stages: {
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'POSITION_CREATED',
        entityType: 'Position',
        entityId: position.id,
        details: JSON.stringify({ title: position.title, department: position.department, status: position.status })
      }
    });

    return position;
  }

  /**
   * Internal list of positions for HR/Manager oversight
   */
  static async getPositions(query?: { status?: PositionStatus; department?: string; search?: string }) {
    const where: Prisma.PositionWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.department) {
      where.department = { contains: query.department, mode: 'insensitive' };
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    return prisma.position.findMany({
      where,
      include: {
        stages: {
          orderBy: { sequenceOrder: 'asc' }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Internal detail view for HR/Manager oversight
   */
  static async getPositionById(id: string) {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { sequenceOrder: 'asc' }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { applications: true }
        }
      }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    return position;
  }

  /**
   * HR updates position content
   */
  static async updatePosition(actorId: string, id: string, input: UpdatePositionInput) {
    const existingPosition = await prisma.position.findUnique({ where: { id } });
    if (!existingPosition) {
      throw new AppError(404, 'Position not found.');
    }

    const updatedPosition = await prisma.position.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.department !== undefined && { department: input.department }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.requiredSkills !== undefined && { requiredSkills: input.requiredSkills }),
        ...(input.headcount !== undefined && { headcount: input.headcount }),
        ...(input.pipelineTemplateId !== undefined && { pipelineTemplateId: input.pipelineTemplateId })
      },
      include: {
        stages: {
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'POSITION_UPDATED',
        entityType: 'Position',
        entityId: id,
        details: JSON.stringify(input)
      }
    });

    return updatedPosition;
  }

  /**
   * HR changes position status (Draft -> Open -> OnHold -> Closed)
   */
  static async updatePositionStatus(actorId: string, id: string, status: PositionStatus) {
    const existingPosition = await prisma.position.findUnique({ where: { id } });
    if (!existingPosition) {
      throw new AppError(404, 'Position not found.');
    }

    const previousStatus = existingPosition.status;
    const updatedPosition = await prisma.position.update({
      where: { id },
      data: { status },
      include: {
        stages: {
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'POSITION_STATUS_CHANGED',
        entityType: 'Position',
        entityId: id,
        details: JSON.stringify({ previousStatus, newStatus: status })
      }
    });

    return updatedPosition;
  }

  /**
   * Public directory list of Open positions only
   */
  static async getPublicPositions(query?: PublicPositionQueryInput) {
    const where: Prisma.PositionWhereInput = {
      status: PositionStatus.Open
    };

    if (query?.department) {
      where.department = { contains: query.department, mode: 'insensitive' };
    }

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { requiredSkills: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    return prisma.position.findMany({
      where,
      select: {
        id: true,
        title: true,
        department: true,
        description: true,
        requiredSkills: true,
        headcount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Public job detail view (returns 404 if not found or not Open)
   */
  static async getPublicPositionById(id: string) {
    const position = await prisma.position.findFirst({
      where: {
        id,
        status: PositionStatus.Open
      },
      select: {
        id: true,
        title: true,
        department: true,
        description: true,
        requiredSkills: true,
        headcount: true,
        createdAt: true
      }
    });

    if (!position) {
      throw new AppError(404, 'Job position not found or is no longer accepting applications.');
    }

    return position;
  }
}
