import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export interface SearchResultItem {
  id: string;
  type: 'candidate' | 'position' | 'application' | 'interview' | 'team';
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}

export class SearchService {
  /**
   * Authenticated, role-filtered global search across the system.
   */
  static async search(
    actor: { id: string; role: Role; teamId?: string | null },
    query: string,
    typeFilter: string = 'all'
  ): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // Helper: determine accessible scope for TeamLead
    const isLead = actor.role === Role.TeamLead;
    const actorTeamId = actor.teamId;

    // 1. Search Candidates
    if (typeFilter === 'all' || typeFilter === 'candidates') {
      const candidateWhere: any = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } }
        ]
      };

      if (isLead) {
        // Only candidates who have an application assigned to lead's team OR lead is interviewer
        candidateWhere.applications = {
          some: {
            OR: [
              ...(actorTeamId ? [{ assignedTeamId: actorTeamId }] : []),
              {
                interviews: {
                  some: {
                    assignments: { some: { interviewerId: actor.id } }
                  }
                }
              }
            ]
          }
        };
      }

      const candidates = await prisma.candidate.findMany({
        where: candidateWhere,
        take: 10,
        select: { id: true, name: true, email: true }
      });

      for (const c of candidates) {
        results.push({
          id: c.id,
          type: 'candidate',
          title: c.name,
          subtitle: c.email,
          badge: 'Candidate',
          url: isLead ? `/portal/teamlead/interviews` : `/portal/hr/applications?search=${encodeURIComponent(c.name)}`
        });
      }
    }

    // 2. Search Positions
    if (typeFilter === 'all' || typeFilter === 'positions') {
      const posWhere: any = {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } }
        ]
      };

      const positions = await prisma.position.findMany({
        where: posWhere,
        take: 10,
        select: { id: true, title: true, department: true, status: true }
      });

      for (const p of positions) {
        results.push({
          id: p.id,
          type: 'position',
          title: p.title,
          subtitle: `${p.department} (${p.status})`,
          badge: 'Position',
          url: isLead ? `/portal/teamlead/interviews` : `/portal/hr/positions`
        });
      }
    }

    // 3. Search Applications
    if (typeFilter === 'all' || typeFilter === 'applications') {
      const appWhere: any = {
        OR: [
          { candidate: { name: { contains: q, mode: 'insensitive' } } },
          { position: { title: { contains: q, mode: 'insensitive' } } }
        ]
      };

      if (isLead) {
        appWhere.AND = [
          {
            OR: [
              ...(actorTeamId ? [{ assignedTeamId: actorTeamId }] : []),
              {
                interviews: {
                  some: {
                    assignments: { some: { interviewerId: actor.id } }
                  }
                }
              }
            ]
          }
        ];
      }

      const applications = await prisma.application.findMany({
        where: appWhere,
        take: 10,
        include: {
          candidate: { select: { name: true } },
          position: { select: { title: true } },
          currentStage: { select: { name: true } }
        }
      });

      for (const a of applications) {
        results.push({
          id: a.id,
          type: 'application',
          title: a.candidate.name,
          subtitle: `${a.position.title} • Stage: ${a.currentStage.name}`,
          badge: `App (${a.status})`,
          url: isLead ? `/portal/teamlead/interviews` : `/portal/hr/applications/${a.id}`
        });
      }
    }

    // 4. Search Interviews
    if (typeFilter === 'all' || typeFilter === 'interviews') {
      const interviewWhere: any = {
        OR: [
          { application: { candidate: { name: { contains: q, mode: 'insensitive' } } } },
          { application: { position: { title: { contains: q, mode: 'insensitive' } } } },
          { stage: { name: { contains: q, mode: 'insensitive' } } }
        ]
      };

      if (isLead) {
        interviewWhere.assignments = {
          some: { interviewerId: actor.id }
        };
      }

      const interviews = await prisma.interview.findMany({
        where: interviewWhere,
        take: 10,
        include: {
          application: {
            select: {
              id: true,
              candidate: { select: { name: true } },
              position: { select: { title: true } }
            }
          },
          stage: { select: { name: true } }
        }
      });

      for (const i of interviews) {
        results.push({
          id: i.id,
          type: 'interview',
          title: `Interview: ${i.application.candidate.name}`,
          subtitle: `${i.application.position.title} • ${i.stage.name} (${i.status})`,
          badge: 'Interview',
          url: isLead ? `/portal/teamlead/interviews/${i.id}` : `/portal/hr/applications/${i.application.id}`
        });
      }
    }

    // 5. Search Teams (HR & Manager only)
    if ((typeFilter === 'all' || typeFilter === 'teams') && !isLead) {
      const teams = await prisma.team.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' }
        },
        take: 5,
        select: { id: true, name: true }
      });

      for (const t of teams) {
        results.push({
          id: t.id,
          type: 'team',
          title: t.name,
          subtitle: 'Recruitment Team',
          badge: 'Team',
          url: `/portal/manager/teams`
        });
      }
    }

    return results;
  }
}
