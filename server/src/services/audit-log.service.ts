import { Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export type AuthAuditEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | '2FA_CHALLENGE_ISSUED'
  | '2FA_SUCCESS'
  | '2FA_FAILED'
  | '2FA_SETUP'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | 'BACKUP_CODES_REGENERATED'
  | 'AUTH_LOGOUT';

export interface CreateAuditLogParams {
  actorId?: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LogAuthEventParams {
  actorId?: string | null;
  actionType: AuthAuditEventType;
  entityId?: string;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  /**
   * Sensitive key patterns that must NEVER be persisted in audit details.
   */
  private static readonly SENSITIVE_KEY_PATTERN =
    /password|secret|token|hash|backupcode|codehash|authkey|credential/i;

  /**
   * Sanitizes detail payload to ensure zero passwords, secrets, tokens, or codes are recorded.
   */
  public static sanitizeDetails(details: Record<string, any> | string | null | undefined): string | null {
    if (!details) return null;
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return JSON.stringify(this.sanitizeObject(parsed));
      } catch {
        // Plain string detail: ensure no sensitive keywords appear
        return details.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]');
      }
    }
    return JSON.stringify(this.sanitizeObject(details));
  }

  private static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_KEY_PATTERN.test(key)) {
        cleaned[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = this.sanitizeObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Extracts client IP address and User Agent string from an Express request object.
   */
  public static extractRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
    const forwarded = req.headers['x-forwarded-for'];
    let ipAddress: string;
    if (typeof forwarded === 'string') {
      ipAddress = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded) && forwarded.length > 0) {
      ipAddress = forwarded[0].trim();
    } else {
      ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    }

    const userAgent = req.headers['user-agent'] || 'unknown';

    return { ipAddress, userAgent };
  }

  /**
   * Persists an AuditLog record with nullable actorId, metadata, and sanitized details.
   */
  public static async createAuditLog(
    params: CreateAuditLogParams,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const sanitized = this.sanitizeDetails(params.details);

    return db.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId,
        details: sanitized,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  /**
   * High-level helper specifically tailored for authentication and 2FA events.
   */
  public static async logAuthEvent(
    params: LogAuthEventParams,
    tx?: Prisma.TransactionClient
  ) {
    return this.createAuditLog(
      {
        actorId: params.actorId || null,
        actionType: params.actionType,
        entityType: 'User',
        entityId: params.entityId || params.actorId || 'unknown',
        details: params.details,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
      tx
    );
  }
}

export default AuditLogService;
