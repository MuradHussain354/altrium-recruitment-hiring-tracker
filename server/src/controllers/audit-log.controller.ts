import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

export class AuditLogController {
  /**
   * GET /api/v1/audit-logs
   * Manager-only: paginated, filterable audit log list for B3-06 Access Log viewer.
   *
   * Query params:
   *   page       - page number (default: 1)
   *   limit      - results per page (default: 50, max: 100)
   *   actionType - filter by exact action type string
   *   actorId    - filter by actor userId
   *   search     - substring search in entityId, actionType, ipAddress, userAgent
   *   from       - ISO date start (inclusive)
   *   to         - ISO date end (inclusive)
   */
  static async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const rawLimit = parseInt(String(req.query.limit || '50'), 10) || 50;
      const limit = Math.min(Math.max(1, rawLimit), 100);
      const skip = (page - 1) * limit;

      const { actionType, actorId, search, from, to } = req.query;

      // Build Prisma where clause
      const where: any = {};

      if (actionType && typeof actionType === 'string') {
        where.actionType = actionType.trim();
      }

      if (actorId && typeof actorId === 'string') {
        where.actorId = actorId.trim();
      }

      if (from || to) {
        where.timestamp = {};
        if (from && typeof from === 'string') {
          const fromDate = new Date(from);
          if (!isNaN(fromDate.getTime())) {
            where.timestamp.gte = fromDate;
          }
        }
        if (to && typeof to === 'string') {
          const toDate = new Date(to);
          if (!isNaN(toDate.getTime())) {
            // End of day
            toDate.setHours(23, 59, 59, 999);
            where.timestamp.lte = toDate;
          }
        }
      }

      if (search && typeof search === 'string') {
        const term = search.trim();
        if (term.length > 0) {
          where.OR = [
            { actionType: { contains: term, mode: 'insensitive' } },
            { entityId: { contains: term, mode: 'insensitive' } },
            { ipAddress: { contains: term, mode: 'insensitive' } },
            { userAgent: { contains: term, mode: 'insensitive' } },
          ];
        }
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit,
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        }),
      ]);

      res.status(200).json({
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
