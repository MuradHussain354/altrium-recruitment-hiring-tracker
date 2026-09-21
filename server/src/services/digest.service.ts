import prisma from '../config/prisma';
import { Role, PositionStatus, ApplicationStatus, InterviewStatus, OfferApprovalStatus } from '@prisma/client';

export interface DigestPayload {
  generatedAt: Date;
  managerCount: number;
  openPositionsCount: number;
  inProgressApplicationsCount: number;
  upcomingInterviewsCount: number;
  pendingOffersCount: number;
  agingApplicationsCount: number;
  summary: {
    openPositions: Array<{ id: string; title: string; department: string }>;
    pendingOffers: Array<{ id: string; candidateName: string; positionTitle: string }>;
    upcomingInterviews: Array<{ id: string; candidateName: string; scheduledAt: Date | null }>;
  };
}

/**
 * Stateless foundation service for aggregating executive recruitment metrics
 * for future Manager digests (Batch 4 delivery).
 */
export class DigestService {
  /**
   * Returns all active users with role Manager.
   */
  static async getManagerRecipients() {
    return prisma.user.findMany({
      where: {
        role: Role.Manager,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
  }

  /**
   * Aggregates key recruitment metrics for Manager reporting.
   */
  static async buildDigestPayload(options: { referenceDate?: Date } = {}): Promise<DigestPayload> {
    const now = options.referenceDate || new Date();
    const managers = await this.getManagerRecipients();

    // 1. Open positions
    const openPositions = await prisma.position.findMany({
      where: { status: PositionStatus.Open },
      select: { id: true, title: true, department: true }
    });

    // 2. In-progress applications
    const inProgressApplicationsCount = await prisma.application.count({
      where: { status: ApplicationStatus.InProgress }
    });

    // 3. Upcoming interviews in the next 7 days
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        status: InterviewStatus.Scheduled,
        scheduledAt: {
          gte: now,
          lte: next7Days
        }
      },
      select: {
        id: true,
        scheduledAt: true,
        application: {
          select: {
            candidate: { select: { name: true } }
          }
        }
      }
    });

    // 4. Pending offer approvals
    const pendingOffers = await prisma.application.findMany({
      where: {
        offerApprovalStatus: OfferApprovalStatus.Pending
      },
      select: {
        id: true,
        candidate: { select: { name: true } },
        position: { select: { title: true } }
      }
    });

    // 5. Aging threshold applications (7+ days in stage or created)
    const agingCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const agingApplicationsCount = await prisma.application.count({
      where: {
        status: ApplicationStatus.InProgress,
        createdAt: { lte: agingCutoff }
      }
    });

    return {
      generatedAt: now,
      managerCount: managers.length,
      openPositionsCount: openPositions.length,
      inProgressApplicationsCount,
      upcomingInterviewsCount: upcomingInterviews.length,
      pendingOffersCount: pendingOffers.length,
      agingApplicationsCount,
      summary: {
        openPositions: openPositions.map((p) => ({
          id: p.id,
          title: p.title,
          department: p.department
        })),
        pendingOffers: pendingOffers.map((o) => ({
          id: o.id,
          candidateName: o.candidate?.name || 'Unknown',
          positionTitle: o.position?.title || 'Unknown'
        })),
        upcomingInterviews: upcomingInterviews.map((i) => ({
          id: i.id,
          candidateName: i.application?.candidate?.name || 'Unknown',
          scheduledAt: i.scheduledAt
        }))
      }
    };
  }
}
