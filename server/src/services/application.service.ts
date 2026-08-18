import prisma from '../config/prisma';
import { ApplicationStatus, PositionStatus, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { CandidateApplicationInput } from '../schemas/application.schema';

export class ApplicationService {
  /**
   * Public Candidate Job Application Submission
   * Validates position Open status and stage presence, reuses existing Candidate identity
   * without overwriting profile data, enforces composite unique application constraint,
   * and executes inside a transaction.
   */
  static async submitApplication(input: CandidateApplicationInput) {
    // 1. Verify Position exists and is Open
    const position = await prisma.position.findUnique({
      where: { id: input.positionId }
    });

    if (!position) {
      throw new AppError(404, 'Position not found.');
    }

    if (position.status !== PositionStatus.Open) {
      throw new AppError(400, 'Position is not open for applications.');
    }

    // 2. Query initial Stage ordered by sequenceOrder ASC
    const initialStage = await prisma.stage.findFirst({
      where: { positionId: input.positionId },
      orderBy: { sequenceOrder: 'asc' }
    });

    if (!initialStage) {
      throw new AppError(400, 'This position is not yet configured to accept applications.');
    }

    const normalizedEmail = input.email.toLowerCase().trim();

    try {
      // 3. Execute atomic transaction to handle candidate reuse and application creation
      return await prisma.$transaction(async (tx) => {
        // Find existing candidate by normalized email
        let candidate = await tx.candidate.findFirst({
          where: { email: normalizedEmail }
        });

        if (!candidate) {
          // Create new Candidate identity if none exists
          candidate = await tx.candidate.create({
            data: {
              name: input.name,
              email: normalizedEmail,
              phone: input.phone,
              resumeUrl: input.resumeUrl,
              source: input.source
            }
          });
        }
        // NOTE: If candidate exists, we preserve existing Candidate identity and profile data
        // as per requirements (no automatic profile overwrites during application submission).

        // Create new Application record
        const application = await tx.application.create({
          data: {
            candidateId: candidate.id,
            positionId: input.positionId,
            currentStageId: initialStage.id,
            status: ApplicationStatus.InProgress
          },
          include: {
            candidate: {
              select: { id: true, name: true, email: true, phone: true, resumeUrl: true, source: true }
            },
            position: {
              select: { id: true, title: true, department: true }
            },
            currentStage: {
              select: { id: true, name: true, sequenceOrder: true }
            }
          }
        });

        return application;
      });
    } catch (error) {
      // Catch Prisma P2002 Unique Constraint violation on [candidateId, positionId]
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'You have already applied for this position.');
      }
      throw error;
    }
  }
}
