import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { reportFilterSchema } from '../schemas/report.schema';
import { AppError } from '../utils/errors';

export class ReportController {
  /**
   * GET /api/v1/reports/overview
   * Manager only: primary overview recruitment metrics
   */
  static async getOverviewReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reportFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const report = await ReportService.getOverviewReport(parsed.data);

      res.status(200).json({
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/positions
   * Manager only: per-position metrics and application totals
   */
  static async getPositionsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reportFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const report = await ReportService.getPositionsReport(parsed.data);

      res.status(200).json({
        data: report,
        count: report.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/pipeline
   * Manager only: current snapshot of candidate counts across pipeline stages
   */
  static async getPipelineReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reportFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const report = await ReportService.getPipelineReport(parsed.data);

      res.status(200).json({
        data: report,
        count: report.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/interviews
   * Manager only: interview metrics and meeting schedules
   */
  static async getInterviewsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reportFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors.map((e) => e.message).join(', '));
      }

      const report = await ReportService.getInterviewsReport(parsed.data);

      res.status(200).json({
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}
