import { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service';

export class ExportController {
  /**
   * GET /api/v1/applications/export/excel
   * HR & Manager: Export shortlisted candidates to Excel (.xlsx)
   */
  static async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let applicationIds: string[] | undefined;
      if (typeof req.query.ids === 'string') {
        applicationIds = req.query.ids.split(',').map((id) => id.trim()).filter(Boolean);
      } else if (Array.isArray(req.query.ids)) {
        applicationIds = (req.query.ids as string[]).map((id) => String(id).trim()).filter(Boolean);
      }

      const data = await ExportService.getExportData(applicationIds);
      const buffer = await ExportService.generateExcel(data);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="candidates-shortlist.xlsx"');
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/applications/export/pdf
   * HR & Manager: Export shortlisted candidates to PDF
   */
  static async exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let applicationIds: string[] | undefined;
      if (typeof req.query.ids === 'string') {
        applicationIds = req.query.ids.split(',').map((id) => id.trim()).filter(Boolean);
      } else if (Array.isArray(req.query.ids)) {
        applicationIds = (req.query.ids as string[]).map((id) => String(id).trim()).filter(Boolean);
      }

      const data = await ExportService.getExportData(applicationIds);
      const buffer = await ExportService.generatePdf(data);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="candidates-shortlist.pdf"');
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
