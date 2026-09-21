import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';

export class SearchController {
  /**
   * GET /api/v1/search
   * Unified quick search endpoint across candidates, positions, applications, interviews
   */
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const type = typeof req.query.type === 'string' ? req.query.type : 'all';

      const results = await SearchService.search(
        req.user! as any,
        q,
        type
      );

      res.status(200).json({
        data: results,
        count: results.length
      });
    } catch (error) {
      next(error);
    }
  }
}
