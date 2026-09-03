import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';
import { createTeamSchema } from '../schemas/team.schema';
import { AppError } from '../utils/errors';

export class TeamController {
  /**
   * GET /api/v1/teams
   * HR & Manager: list all teams
   */
  static async listTeams(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await TeamService.listTeams();
      res.status(200).json({
        data: teams,
        count: teams.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/teams
   * Manager only: create a new team
   */
  static async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication token required');
      }
      const validatedInput = createTeamSchema.parse(req.body);
      const newTeam = await TeamService.createTeam(req.user.id, validatedInput);
      res.status(201).json({
        message: 'Team created successfully',
        data: newTeam
      });
    } catch (error) {
      next(error);
    }
  }
}
