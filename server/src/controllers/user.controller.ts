import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { createManagedUserSchema, updateUserStatusSchema } from '../schemas/user.schema';
import { AppError } from '../utils/errors';

export class UserController {
  /**
   * GET /api/v1/users/interviewers
   * HR & Manager: list active HR and TeamLead interviewers
   */
  static async getEligibleInterviewers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const interviewers = await UserService.listEligibleInterviewers();
      res.status(200).json({
        data: interviewers,
        count: interviewers.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users
   * Manager only: list all managed HR and TeamLead staff accounts (active and inactive)
   */
  static async listManagedUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.listManagedUsers();
      res.status(200).json({
        data: users,
        count: users.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async createManagedUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication token required');
      }
      const validatedInput = createManagedUserSchema.parse(req.body);
      const newUser = await UserService.createManagedUser(req.user.id, validatedInput);
      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async setUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication token required');
      }
      const { id } = req.params;
      if (!id) {
        throw new AppError(400, 'User ID is required in request parameters');
      }
      const validatedInput = updateUserStatusSchema.parse(req.body);
      const updatedUser = await UserService.setUserStatus(req.user.id, id, validatedInput);
      res.status(200).json({
        message: `User account ${validatedInput.isActive ? 'activated' : 'deactivated'} successfully`,
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/:userId/resend-invitation
   * Manager only: reissues a fresh invitation token for a still-pending account.
   */
  static async resendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication token required');
      }
      const { userId } = req.params;
      if (!userId) {
        throw new AppError(400, 'User ID is required in request parameters');
      }
      const result = await UserService.resendInvitation(req.user.id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
