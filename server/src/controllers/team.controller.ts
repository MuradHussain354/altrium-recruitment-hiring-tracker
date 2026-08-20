import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';

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
}
