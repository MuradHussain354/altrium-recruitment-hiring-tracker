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

  /**
   * GET /api/v1/reports/cross-team
   * Manager only: S2-25 Cross-team comparative analytics
   */
  static async getCrossTeamAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getCrossTeamAnalytics();
      res.status(200).json({
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/headcount-fulfillment
   * Manager only: S2-28 Headcount vs approved / hired report
   */
  static async getHeadcountFulfillmentReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getHeadcountFulfillmentReport();
      res.status(200).json({
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/aging
   * Manager only: Application Aging & Stage SLA Report (R-04, R-05, R-06)
   */
  static async getApplicationAgingReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        department: req.query.department as string | undefined,
        positionId: req.query.positionId as string | undefined,
        severity: req.query.severity as string | undefined
      };

      const report = await ReportService.getApplicationAgingReport(filters);
      res.status(200).json({
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
}
