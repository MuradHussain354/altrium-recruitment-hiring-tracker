import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateStageInput, UpdateStageInput, ReorderStagesInput } from '../schemas/stage.schema';

export class StageService {
  /**
   * HR creates a recruitment stage for a Position.
   * If sequenceOrder is omitted, automatically assigns max(sequenceOrder) + 1.
   * If sequenceOrder is explicitly provided, verifies sequence order uniqueness in position.
   */
  static async createStage(actorId: string, positionId: string, input: CreateStageInput) {
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    const existingStages = await prisma.stage.findMany({
      where: { positionId }
    });

    let targetSequenceOrder: number;

    if (input.sequenceOrder !== undefined) {
      const duplicate = existingStages.find((s) => s.sequenceOrder === input.sequenceOrder);
      if (duplicate) {
        throw new AppError(409, `A stage with sequence order ${input.sequenceOrder} already exists for this position.`);
      }
      targetSequenceOrder = input.sequenceOrder;
    } else {
      targetSequenceOrder =
        existingStages.length > 0
          ? Math.max(...existingStages.map((s) => s.sequenceOrder)) + 1
          : 1;
    }

    const stage = await prisma.stage.create({
      data: {
        positionId,
        name: input.name,
        sequenceOrder: targetSequenceOrder,
        isGating: input.isGating ?? true,
        feedbackRequiredCount: input.feedbackRequiredCount ?? 1
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'STAGE_CREATED',
        entityType: 'Stage',
        entityId: stage.id,
        details: JSON.stringify({
          positionId,
          name: stage.name,
          sequenceOrder: stage.sequenceOrder,
          isGating: stage.isGating,
          feedbackRequiredCount: stage.feedbackRequiredCount
        })
      }
    });

    return stage;
  }

  /**
   * List stages for a position sorted by sequenceOrder ASC
   */
  static async getStagesByPosition(positionId: string) {
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    return prisma.stage.findMany({
      where: { positionId },
      orderBy: { sequenceOrder: 'asc' }
    });
  }

  /**
   * Get single stage detail by stageId and positionId
   */
  static async getStageById(positionId: string, stageId: string) {
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    const stage = await prisma.stage.findUnique({
      where: { id: stageId }
    });

    if (!stage || stage.positionId !== positionId) {
      throw new AppError(404, 'Stage not found or does not belong to specified position.');
    }

    return stage;
  }

  /**
   * HR updates stage attributes (name, isGating, feedbackRequiredCount).
   * Note: sequenceOrder changes via individual update are intentionally disallowed.
   */
  static async updateStage(actorId: string, positionId: string, stageId: string, input: UpdateStageInput) {
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    const existingStage = await prisma.stage.findUnique({
      where: { id: stageId }
    });

    if (!existingStage || existingStage.positionId !== positionId) {
      throw new AppError(404, 'Stage not found or does not belong to specified position.');
    }

    const updatedStage = await prisma.stage.update({
      where: { id: stageId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.isGating !== undefined && { isGating: input.isGating }),
        ...(input.feedbackRequiredCount !== undefined && { feedbackRequiredCount: input.feedbackRequiredCount })
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'STAGE_UPDATED',
        entityType: 'Stage',
        entityId: stageId,
        details: JSON.stringify(input)
      }
    });

    return updatedStage;
  }

  /**
   * HR reorders all stages of a Position in a single atomic transaction.
   * Enforces complete pipeline representation, contiguous 1..N sequence, and position ownership.
   */
  static async reorderStages(actorId: string, positionId: string, input: ReorderStagesInput) {
    const position = await prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    const existingStages = await prisma.stage.findMany({
      where: { positionId }
    });

    if (existingStages.length === 0) {
      throw new AppError(400, 'Position has no stages configured to reorder.');
    }

    // 1. Verify complete pipeline representation
    if (input.stages.length !== existingStages.length) {
      throw new AppError(400, 'Reorder payload must include all stages for this position.');
    }

    // 2. Check duplicate stage IDs in payload
    const payloadStageIdsSet = new Set(input.stages.map((s) => s.stageId));
    if (payloadStageIdsSet.size !== input.stages.length) {
      throw new AppError(400, 'Reorder payload contains duplicate stage IDs.');
    }

    // 3. Verify position ownership for every stage ID in payload
    const existingStageIdsSet = new Set(existingStages.map((s) => s.id));
    for (const item of input.stages) {
      if (!existingStageIdsSet.has(item.stageId)) {
        throw new AppError(400, `Stage ${item.stageId} does not belong to specified position.`);
      }
    }

    // 4. Verify sequence numbers are unique and form contiguous 1..N
    const sortedSequences = input.stages.map((s) => s.sequenceOrder).sort((a, b) => a - b);
    const uniqueSequencesSet = new Set(sortedSequences);
    if (uniqueSequencesSet.size !== sortedSequences.length) {
      throw new AppError(400, 'Reorder payload contains duplicate sequence order values.');
    }

    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new AppError(400, 'Sequence orders must form a contiguous range starting from 1.');
      }
    }

    // 5. Execute atomic transaction to update sequence orders
    await prisma.$transaction(async (tx) => {
      // First temporary offset to prevent intermediate constraint issues if any
      for (const item of input.stages) {
        await tx.stage.update({
          where: { id: item.stageId },
          data: { sequenceOrder: item.sequenceOrder + 1000 }
        });
      }

      for (const item of input.stages) {
        await tx.stage.update({
          where: { id: item.stageId },
          data: { sequenceOrder: item.sequenceOrder }
        });
      }
    });

    // 6. Record AuditLog
    await prisma.auditLog.create({
      data: {
        actorId,
        actionType: 'STAGE_REORDERED',
        entityType: 'Position',
        entityId: positionId,
        details: JSON.stringify({ reorderedCount: input.stages.length })
      }
    });

    return prisma.stage.findMany({
      where: { positionId },
      orderBy: { sequenceOrder: 'asc' }
    });
  }
}
