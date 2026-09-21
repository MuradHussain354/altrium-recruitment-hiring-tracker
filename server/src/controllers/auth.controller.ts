import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { AuditLogService } from '../services/audit-log.service';
import {
  loginSchema,
  enable2FASchema,
  disable2FASchema,
  regenerateBackupCodesSchema,
  verify2FALoginSchema,
  invitationDetailsQuerySchema,
  acceptInvitationSchema,
} from '../schemas/auth.schema';
import { AppError } from '../utils/errors';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.login(validatedInput, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/invitation-details?token=...
   * Public: returns sanitized invitation details for the acceptance page.
   * Never reveals whether a token is unknown, expired, or already accepted.
   */
  static async getInvitationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = invitationDetailsQuerySchema.parse(req.query);
      const details = await UserService.getInvitationDetails(token);
      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/accept-invitation
   * Public: atomically activates an invited account and issues a standard JWT.
   */
  static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = acceptInvitationSchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await UserService.acceptInvitation(validatedInput.token, validatedInput.password, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async verify2FALogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = verify2FALoginSchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.verify2FALogin(validatedInput, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async setup2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.setup2FA(req.user.id, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const validatedInput = enable2FASchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.enable2FA(req.user.id, validatedInput, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async disable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const validatedInput = disable2FASchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.disable2FA(req.user.id, validatedInput, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async regenerateBackupCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const validatedInput = regenerateBackupCodesSchema.parse(req.body);
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.regenerateBackupCodes(req.user.id, validatedInput, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get2FAStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const result = await AuthService.get2FAStatus(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      const meta = AuditLogService.extractRequestMeta(req);
      const result = await AuthService.logout(req.user.id, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication token required');
      }
      const user = await AuthService.getMe(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}
