import prisma from '../config/prisma';
import { PositionStatus, ApplicationStatus, InterviewStatus } from '@prisma/client';
import { ReportFilterInput } from '../schemas/report.schema';

export class ReportService {
  /**
   * Primary Overview Report:
   * Aggregates position, application, candidate, interview, and feedback metrics.
   * Includes upcoming interview schedule with minimal operational data (no candidate PII).
   */
  static async getOverviewReport(filters: ReportFilterInput) {
    // ── Build Prisma where clauses ───────────────────────────────────────────
    const positionWhere: Record<string, unknown> = {};
    if (filters.department) {
      positionWhere.department = { equals: filters.department, mode: 'insensitive' };
    }
    if (filters.positionId) {
      positionWhere.id = filters.positionId;
    }
    if (filters.dateFrom || filters.dateTo) {
      positionWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const applicationWhere: Record<string, unknown> = {};
    if (filters.positionId) {
      applicationWhere.positionId = filters.positionId;
    }
    if (filters.department) {
      applicationWhere.position = { department: { equals: filters.department, mode: 'insensitive' } };
    }
    if (filters.dateFrom || filters.dateTo) {
      applicationWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const candidateWhere: Record<string, unknown> = {};
    if (filters.dateFrom || filters.dateTo) {
      candidateWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }
    if (filters.positionId || filters.department) {
      candidateWhere.applications = {
        some: {
          ...(filters.positionId ? { positionId: filters.positionId } : {}),
          ...(filters.department ? { position: { department: { equals: filters.department, mode: 'insensitive' } } } : {})
        }
      };
    }

    const interviewWhere: Record<string, unknown> = {};
    if (filters.positionId || filters.department) {
      interviewWhere.application = {
        ...(filters.positionId ? { positionId: filters.positionId } : {}),
        ...(filters.department ? { position: { department: { equals: filters.department, mode: 'insensitive' } } } : {})
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      interviewWhere.scheduledAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const feedbackWhere: Record<string, unknown> = {};
    if (filters.positionId || filters.department) {
      feedbackWhere.interview = {
        application: {
          ...(filters.positionId ? { positionId: filters.positionId } : {}),
          ...(filters.department ? { position: { department: { equals: filters.department, mode: 'insensitive' } } } : {})
        }
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      feedbackWhere.submittedAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    // ── Run parallel aggregations ────────────────────────────────────────────
    const [
      positionGroups,
      applicationGroups,
      candidateTotal,
      interviewGroups,
      feedbackTotal,
      upcomingInterviewsRaw
    ] = await Promise.all([
      prisma.position.groupBy({
        by: ['status'],
        _count: { id: true },
        where: positionWhere
      }),
      prisma.application.groupBy({
        by: ['status'],
        _count: { id: true },
        where: applicationWhere
      }),
      prisma.candidate.count({ where: candidateWhere }),
      prisma.interview.groupBy({
        by: ['status'],
        _count: { id: true },
        where: interviewWhere
      }),
      prisma.feedback.count({ where: feedbackWhere }),
      prisma.interview.findMany({
        where: {
          ...interviewWhere,
          status: InterviewStatus.Scheduled,
          scheduledAt: {
            not: null,
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {})
          }
        },
        select: {
          id: true,
          applicationId: true,
          scheduledAt: true,
          location: true,
          meetingLink: true,
          status: true,
          application: {
            select: {
              position: { select: { title: true } }
            }
          },
          stage: {
            select: { name: true }
          }
        },
        orderBy: { scheduledAt: 'asc' }
      })
    ]);

    // ── Build structured metrics ─────────────────────────────────────────────
    const positionsByStatus = {
      Draft: 0,
      Open: 0,
      OnHold: 0,
      Closed: 0
    };
    let positionTotal = 0;
    for (const group of positionGroups) {
      positionsByStatus[group.status] = group._count.id;
      positionTotal += group._count.id;
    }

    const applicationsByStatus = {
      InProgress: 0,
      Hired: 0,
      Rejected: 0,
      OnHold: 0
    };
    let applicationTotal = 0;
    for (const group of applicationGroups) {
      applicationsByStatus[group.status] = group._count.id;
      applicationTotal += group._count.id;
    }

    const interviewsByStatus = {
      Scheduled: 0,
      Completed: 0,
      Cancelled: 0
    };
    let interviewTotal = 0;
    for (const group of interviewGroups) {
      interviewsByStatus[group.status] = group._count.id;
      interviewTotal += group._count.id;
    }

    // Format upcoming interviews without candidate personal data
    const upcomingInterviews = upcomingInterviewsRaw.map((item) => ({
      id: item.id,
      applicationId: item.applicationId,
      positionTitle: item.application.position.title,
      stageName: item.stage.name,
      scheduledAt: item.scheduledAt,
      location: item.location,
      meetingLink: item.meetingLink,
      status: item.status
    }));

    return {
      positions: {
        total: positionTotal,
        byStatus: positionsByStatus
      },
      applications: {
        total: applicationTotal,
        byStatus: applicationsByStatus
      },
      candidates: {
        total: candidateTotal
      },
      interviews: {
        total: interviewTotal,
        byStatus: interviewsByStatus
      },
      feedback: {
        totalSubmitted: feedbackTotal
      },
      upcomingInterviews
    };
  }

  /**
   * Position Report:
   * Returns per-position metrics including application status counts and total interview count.
   */
  static async getPositionsReport(filters: ReportFilterInput) {
    const positionWhere: Record<string, unknown> = {};
    if (filters.department) {
      positionWhere.department = { equals: filters.department, mode: 'insensitive' };
    }
    if (filters.positionId) {
      positionWhere.id = filters.positionId;
    }
    if (filters.dateFrom || filters.dateTo) {
      positionWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const positions = await prisma.position.findMany({
      where: positionWhere,
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
        headcount: true,
        applications: {
          select: {
            id: true,
            status: true,
            interviews: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return positions.map((p) => {
      const totalApplications = p.applications.length;
      let inProgressApplications = 0;
      let hiredApplications = 0;
      let rejectedApplications = 0;
      let interviewCount = 0;

      for (const app of p.applications) {
        if (app.status === ApplicationStatus.InProgress) inProgressApplications++;
        else if (app.status === ApplicationStatus.Hired) hiredApplications++;
        else if (app.status === ApplicationStatus.Rejected) rejectedApplications++;

        interviewCount += app.interviews.length;
      }

      return {
        id: p.id,
        title: p.title,
        department: p.department,
        status: p.status,
        headcount: p.headcount,
        totalApplications,
        inProgressApplications,
        hiredApplications,
        rejectedApplications,
        interviewCount
      };
    });
  }

  /**
   * Pipeline Report:
   * Returns current pipeline snapshot with candidate counts at each stage.
   */
  static async getPipelineReport(filters: ReportFilterInput) {
    const positionWhere: Record<string, unknown> = {};
    if (filters.department) {
      positionWhere.department = { equals: filters.department, mode: 'insensitive' };
    }
    if (filters.positionId) {
      positionWhere.id = filters.positionId;
    }
    if (filters.dateFrom || filters.dateTo) {
      positionWhere.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const positions = await prisma.position.findMany({
      where: positionWhere,
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
        stages: {
          select: {
            id: true,
            name: true,
            sequenceOrder: true
          },
          orderBy: { sequenceOrder: 'asc' }
        },
        applications: {
          select: {
            id: true,
            currentStageId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return positions.map((p) => {
      // Map stage application counts based on Application.currentStageId
      const stageCountMap = new Map<string, number>();
      for (const app of p.applications) {
        const count = stageCountMap.get(app.currentStageId) || 0;
        stageCountMap.set(app.currentStageId, count + 1);
      }

      const stages = p.stages.map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        sequenceOrder: stage.sequenceOrder,
        applicationCount: stageCountMap.get(stage.id) || 0
      }));

      return {
        positionId: p.id,
        positionTitle: p.title,
        department: p.department,
        status: p.status,
        totalApplications: p.applications.length,
        stages
      };
    });
  }

  /**
   * Interview Report:
   * Returns interview counts by status, plus upcoming schedule with meeting links.
   */
  static async getInterviewsReport(filters: ReportFilterInput) {
    const interviewWhere: Record<string, unknown> = {};
    if (filters.positionId || filters.department) {
      interviewWhere.application = {
        ...(filters.positionId ? { positionId: filters.positionId } : {}),
        ...(filters.department ? { position: { department: { equals: filters.department, mode: 'insensitive' } } } : {})
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      interviewWhere.scheduledAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {})
      };
    }

    const [groups, interviewList] = await Promise.all([
      prisma.interview.groupBy({
        by: ['status'],
        _count: { id: true },
        where: interviewWhere
      }),
      prisma.interview.findMany({
        where: interviewWhere,
        select: {
          id: true,
          applicationId: true,
          scheduledAt: true,
          location: true,
          meetingLink: true,
          status: true,
          application: {
            select: {
              position: {
                select: {
                  id: true,
                  title: true,
                  department: true
                }
              }
            }
          },
          stage: {
            select: {
              id: true,
              name: true
            }
          },
          assignments: {
            select: { id: true }
          }
        },
        orderBy: { scheduledAt: 'asc' }
      })
    ]);

    const byStatus = {
      Scheduled: 0,
      Completed: 0,
      Cancelled: 0
    };
    let total = 0;
    for (const group of groups) {
      byStatus[group.status] = group._count.id;
      total += group._count.id;
    }

    const interviews = interviewList.map((item) => ({
      id: item.id,
      applicationId: item.applicationId,
      positionId: item.application.position.id,
      positionTitle: item.application.position.title,
      department: item.application.position.department,
      stageId: item.stage.id,
      stageName: item.stage.name,
      scheduledAt: item.scheduledAt,
      location: item.location,
      meetingLink: item.meetingLink,
      status: item.status,
      interviewerCount: item.assignments.length
    }));

    return {
      total,
      byStatus,
      interviews
    };
  }

  // ── S2-25: CROSS-TEAM COMPARATIVE ANALYTICS (Manager) ──────────────────────
  static async getCrossTeamAnalytics() {
    const positions = await prisma.position.findMany({
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            offerApprovalStatus: true,
            createdAt: true,
            updatedAt: true,
            interviews: {
              select: { id: true, status: true }
            }
          }
        }
      }
    });

    const departmentMap = new Map<string, {
      department: string;
      positionCount: number;
      applicationCount: number;
      interviewCount: number;
      hiredCount: number;
      offerApprovedCount: number;
      rejectedCount: number;
      timeToHireTotalDays: number;
      timeToHireCount: number;
    }>();

    for (const pos of positions) {
      const dept = pos.department || 'Unassigned';
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          positionCount: 0,
          applicationCount: 0,
          interviewCount: 0,
          hiredCount: 0,
          offerApprovedCount: 0,
          rejectedCount: 0,
          timeToHireTotalDays: 0,
          timeToHireCount: 0
        });
      }

      const deptStat = departmentMap.get(dept)!;
      deptStat.positionCount += 1;

      for (const app of pos.applications) {
        deptStat.applicationCount += 1;
        deptStat.interviewCount += app.interviews.length;

        if (app.status === ApplicationStatus.Hired) {
          deptStat.hiredCount += 1;
          const diffDays = Math.max(0, (app.updatedAt.getTime() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          deptStat.timeToHireTotalDays += diffDays;
          deptStat.timeToHireCount += 1;
        } else if (app.status === ApplicationStatus.Rejected) {
          deptStat.rejectedCount += 1;
        }

        if (app.offerApprovalStatus === 'Approved') {
          deptStat.offerApprovedCount += 1;
        }
      }
    }

    const comparative = Array.from(departmentMap.values()).map((d) => {
      const avgTimeToHireDays = d.timeToHireCount > 0
        ? Math.round((d.timeToHireTotalDays / d.timeToHireCount) * 10) / 10
        : 0;
      const offerAcceptanceRate = (d.offerApprovedCount + d.hiredCount) > 0 && d.applicationCount > 0
        ? Math.round(((d.offerApprovedCount + d.hiredCount) / d.applicationCount) * 1000) / 10
        : 0;

      return {
        department: d.department,
        positionCount: d.positionCount,
        applicationCount: d.applicationCount,
        interviewCount: d.interviewCount,
        hiredCount: d.hiredCount,
        offerApprovedCount: d.offerApprovedCount,
        rejectedCount: d.rejectedCount,
        avgTimeToHireDays,
        offerAcceptanceRate
      };
    });

    return { comparative };
  }

  // ── S2-28: HEADCOUNT VS APPROVED / HIRED (Manager) ──────────────────────────
  static async getHeadcountFulfillmentReport() {
    const positions = await prisma.position.findMany({
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            offerApprovalStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let overallTargetHeadcount = 0;
    let overallHired = 0;
    let overallOfferApproved = 0;

    const items = positions.map((pos) => {
      const hiredCount = pos.applications.filter((a) => a.status === ApplicationStatus.Hired).length;
      const offerApprovedCount = pos.applications.filter((a) => a.offerApprovalStatus === 'Approved').length;
      const targetHeadcount = pos.headcount || 1;
      const remainingHeadcount = Math.max(0, targetHeadcount - hiredCount);
      const fulfillmentPercent = Math.min(100, Math.round((hiredCount / targetHeadcount) * 100));

      overallTargetHeadcount += targetHeadcount;
      overallHired += hiredCount;
      overallOfferApproved += offerApprovedCount;

      return {
        positionId: pos.id,
        title: pos.title,
        department: pos.department,
        status: pos.status,
        targetHeadcount,
        hiredCount,
        offerApprovedCount,
        remainingHeadcount,
        fulfillmentPercent
      };
    });

    return {
      summary: {
        totalPositions: positions.length,
        overallTargetHeadcount,
        overallHired,
        overallOfferApproved,
        overallFulfillmentPercent: overallTargetHeadcount > 0
          ? Math.min(100, Math.round((overallHired / overallTargetHeadcount) * 100))
          : 0
      },
      positions: items
    };
  }
}
