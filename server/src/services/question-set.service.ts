import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateQuestionSetInput, UpdateQuestionSetInput } from '../schemas/batch2.schemas';

export class QuestionSetService {
  /**
   * Create a new reusable question set with questions.
   */
  static async createQuestionSet(
    createdById: string,
    input: CreateQuestionSetInput
  ) {
    const questionSet = await prisma.$transaction(async (tx) => {
      const qs = await tx.questionSet.create({
        data: {
          title: input.title,
          description: input.description,
          category: input.category || 'General',
          createdById
        }
      });

      if (input.questions && input.questions.length > 0) {
        await tx.question.createMany({
          data: input.questions.map((q, idx) => ({
            questionSetId: qs.id,
            questionText: q.questionText,
            sequenceOrder: q.sequenceOrder ?? idx,
            guidance: q.guidance ?? null
          }))
        });
      }

      return tx.questionSet.findUnique({
        where: { id: qs.id },
        include: {
          questions: {
            orderBy: { sequenceOrder: 'asc' }
          },
          createdBy: {
            select: { id: true, name: true }
          }
        }
      });
    });

    return questionSet;
  }

  /**
   * List all question sets with questions count and usage indicator.
   */
  static async getQuestionSets(category?: string) {
    const where: any = {};
    if (category) {
      where.category = category;
    }

    const sets = await prisma.questionSet.findMany({
      where,
      include: {
        _count: {
          select: { questions: true, interviews: true }
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sets.map(s => ({
      ...s,
      isUsedByInterviews: s._count.interviews > 0,
      questionCount: s._count.questions
    }));
  }

  /**
   * Get single question set with all questions in sequence order.
   */
  static async getQuestionSetById(id: string) {
    const qs = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sequenceOrder: 'asc' }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        _count: {
          select: { interviews: true }
        }
      }
    });

    if (!qs) {
      throw new AppError(404, 'Question set not found.');
    }

    return {
      ...qs,
      isUsedByInterviews: qs._count.interviews > 0
    };
  }

  /**
   * Update question set.
   * Enforces historical integrity:
   * If associated with at least one interview, question content cannot be destructively modified.
   */
  static async updateQuestionSet(
    id: string,
    input: UpdateQuestionSetInput
  ) {
    const existing = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        _count: { select: { interviews: true } }
      }
    });

    if (!existing) {
      throw new AppError(404, 'Question set not found.');
    }

    const isUsed = existing._count.interviews > 0;

    // If used, reject destructive modification of questions
    if (isUsed && input.questions !== undefined) {
      throw new AppError(
        400,
        'This question set has already been used in interviews and its questions cannot be modified, preserving historical interview integrity. Please create a new copy of this question set instead.'
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.questionSet.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          category: input.category
        }
      });

      if (!isUsed && input.questions) {
        // Safe to replace questions since it has not been used yet
        await tx.question.deleteMany({
          where: { questionSetId: id }
        });

        await tx.question.createMany({
          data: input.questions.map((q, idx) => ({
            questionSetId: id,
            questionText: q.questionText,
            sequenceOrder: q.sequenceOrder ?? idx,
            guidance: q.guidance ?? null
          }))
        });
      }

      return tx.questionSet.findUnique({
        where: { id },
        include: {
          questions: { orderBy: { sequenceOrder: 'asc' } }
        }
      });
    });
  }

  /**
   * Duplicate a question set (creates a safe new version when edits are needed on a used set).
   */
  static async duplicateQuestionSet(
    createdById: string,
    id: string,
    newTitle?: string
  ) {
    const source = await prisma.questionSet.findUnique({
      where: { id },
      include: { questions: { orderBy: { sequenceOrder: 'asc' } } }
    });

    if (!source) {
      throw new AppError(404, 'Source question set not found.');
    }

    return this.createQuestionSet(createdById, {
      title: newTitle || `${source.title} (Copy)`,
      description: source.description ?? undefined,
      category: source.category,
      questions: source.questions.map(q => ({
        questionText: q.questionText,
        sequenceOrder: q.sequenceOrder,
        guidance: q.guidance ?? undefined
      }))
    });
  }

  /**
   * Delete a question set.
   * If referenced by existing interviews, deletion is strictly prohibited.
   */
  static async deleteQuestionSet(id: string) {
    const existing = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        _count: { select: { interviews: true } }
      }
    });

    if (!existing) {
      throw new AppError(404, 'Question set not found.');
    }

    if (existing._count.interviews > 0) {
      throw new AppError(
        400,
        `Cannot delete question set "${existing.title}" because it is associated with ${existing._count.interviews} historical interview(s).`
      );
    }

    await prisma.questionSet.delete({
      where: { id }
    });

    return { success: true, message: 'Question set deleted.' };
  }
}
