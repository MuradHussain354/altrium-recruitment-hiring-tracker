import prisma from '../config/prisma';
import { ApplicationStatus, PositionStatus, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { CandidateApplicationInput, TrackApplicationInput } from '../schemas/application.schema';
import { EmailService } from './email.service';

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
              linkedInUrl: input.linkedInUrl,
              source: input.source
            }
          });
        } else if (input.linkedInUrl && !candidate.linkedInUrl) {
          // If candidate exists without linkedInUrl and provided in this application, update it
          candidate = await tx.candidate.update({
            where: { id: candidate.id },
            data: {
              linkedInUrl: input.linkedInUrl
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
            status: ApplicationStatus.InProgress,
            notes: input.notes
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

        // Enqueue durable Application Confirmation email (S2-39)
        await EmailService.sendApplicationConfirmation(tx, {
          recipient: candidate.email,
          applicationId: application.id,
          candidateName: candidate.name,
          positionTitle: position.title,
          department: position.department,
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

  /**
   * Track Application Status (Public Candidate Safe Tracking)
   * Both conditions — referenceId (application.id) AND candidate normalized email —
   * are enforced in the database WHERE clause. The row is never retrieved unless
   * both match, eliminating any application-layer timing or enumeration risk.
   * Returns strictly sanitized public snapshot of application progress.
   */
  static async trackApplication(input: TrackApplicationInput) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Both referenceId and candidate.email are matched in the DB WHERE clause.
    // candidate.email is NOT selected in the return payload — it is only used as a filter.
    const application = await prisma.application.findFirst({
      where: {
        id: input.referenceId,
        candidate: {
          email: normalizedEmail
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        position: {
          select: { title: true, department: true }
        },
        currentStage: {
          select: { name: true, sequenceOrder: true }
        }
      }
    });

    // Generic not-found: never reveal which condition failed
    if (!application) {
      throw new AppError(404, 'Application not found with the provided details.');
    }

    // Return ONLY candidate-safe information
    return {
      referenceId: application.id,
      positionTitle: application.position.title,
      department: application.position.department,
      status: application.status,
      currentStageName: application.currentStage.name,
      currentStageSequenceOrder: application.currentStage.sequenceOrder,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt
    };
  }
}
