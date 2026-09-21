import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { EmailDeliveryStatus, EmailEventType } from '@prisma/client';

// Fields deliberately excluded from every response: `payload` (may contain an
// encryptedToken envelope or other structured event data not meant for the
// UI), and nothing else on the model is sensitive — there is no passwordHash,
// JWT, TOTP secret, or backup code stored on EmailDeliveryLog at all.
const SAFE_SELECT = {
  id: true,
  eventType: true,
  recipient: true,
  subject: true,
  status: true,
  retryCount: true,
  lastAttemptAt: true,
  nextAttemptAt: true,
  sentAt: true,
  providerMessageId: true,
  errorMessage: true,
  createdAt: true,
} as const;

export class EmailDeliveryLogController {
  /**
   * GET /api/v1/email-logs
   * Manager only (S2-47). Never exposes payload/encryptedToken/invitationTokenHash
   * or any other authentication secret — see SAFE_SELECT above.
   */
  static async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as EmailDeliveryStatus | undefined;
      const eventType = req.query.eventType as EmailEventType | undefined;
      const take = Math.min(parseInt((req.query.limit as string) || '50', 10) || 50, 200);

      const logs = await prisma.emailDeliveryLog.findMany({
        where: {
          ...(status && Object.values(EmailDeliveryStatus).includes(status) ? { status } : {}),
          ...(eventType && Object.values(EmailEventType).includes(eventType) ? { eventType } : {}),
        },
        select: SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        take,
      });

      res.status(200).json({ data: logs, count: logs.length });
    } catch (error) {
      next(error);
    }
  }
}
