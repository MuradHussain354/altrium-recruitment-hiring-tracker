import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

export interface ApplicationExportItem {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  positionTitle: string;
  department: string;
  currentStage: string;
  status: string;
  appliedDate: string;
  tags: string;
  aggregatedScore: string;
}

export class ExportService {
  /**
   * Fetch applications for export by list of IDs or general filter.
   */
  static async getExportData(applicationIds?: string[]): Promise<ApplicationExportItem[]> {
    const where: any = {};
    if (applicationIds && applicationIds.length > 0) {
      where.id = { in: applicationIds };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        candidate: true,
        position: true,
        currentStage: true,
        tags: true,
        interviews: {
          include: {
            feedbacks: {
              include: {
                criterionScores: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return applications.map((app) => {
      // Calculate aggregated score from persisted criterion scores
      let totalWeight = 0;
      let weightedSum = 0;

      for (const interview of app.interviews) {
        for (const feedback of interview.feedbacks) {
          for (const cs of feedback.criterionScores) {
            const weight = Number(cs.weight) || 1.0;
            const score = Number(cs.score);
            weightedSum += score * weight;
            totalWeight += weight;
          }
        }
      }

      const scoreStr = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : 'N/A';

      return {
        id: app.id,
        candidateName: app.candidate.name,
        candidateEmail: app.candidate.email,
        candidatePhone: app.candidate.phone || 'N/A',
        positionTitle: app.position.title,
        department: app.position.department,
        currentStage: app.currentStage.name,
        status: app.status,
        appliedDate: app.createdAt.toISOString().split('T')[0],
        tags: app.tags.map((t) => t.name).join(', ') || 'None',
        aggregatedScore: scoreStr
      };
    });
  }

  /**
   * Generate an Excel (.xlsx) workbook Buffer.
   */
  static async generateExcel(data: ApplicationExportItem[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Altrium Recruitment System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Candidate Shortlist', {
      pageSetup: { orientation: 'landscape' }
    });

    sheet.columns = [
      { header: 'Candidate Name', key: 'candidateName', width: 22 },
      { header: 'Email', key: 'candidateEmail', width: 28 },
      { header: 'Phone', key: 'candidatePhone', width: 18 },
      { header: 'Position Title', key: 'positionTitle', width: 24 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Current Stage', key: 'currentStage', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Applied Date', key: 'appliedDate', width: 14 },
      { header: 'Tags', key: 'tags', width: 24 },
      { header: 'Aggregated Score', key: 'aggregatedScore', width: 18 }
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    };
    headerRow.height = 24;

    // Add rows
    data.forEach((item) => {
      sheet.addRow(item);
    });

    // Formatting borders
    sheet.eachRow((row) => {
      row.alignment = { vertical: 'middle' };
      row.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  /**
   * Generate a PDF report Buffer.
   */
  static async generatePdf(data: ApplicationExportItem[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(18).fillColor('#0F172A').text('Altrium Recruitment — Candidate Shortlist', { align: 'left' });
      doc.fontSize(10).fillColor('#64748B').text(`Generated: ${new Date().toLocaleString()} | Total Candidates: ${data.length}`);
      doc.moveDown(1);

      // Table configuration
      const tableTop = 100;
      const colWidths = [120, 130, 120, 90, 80, 70, 70, 70];
      const headers = ['Candidate', 'Email', 'Position', 'Department', 'Stage', 'Status', 'Applied', 'Score'];

      // Header Row
      let x = 40;
      doc.rect(40, tableTop, 750, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, x + 4, tableTop + 6, { width: colWidths[i], lineBreak: false });
        x += colWidths[i];
      });

      // Data Rows
      let y = tableTop + 24;
      doc.font('Helvetica').fontSize(8);

      data.forEach((item, index) => {
        if (y > 520) {
          doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
          y = 40;
        }

        const bgColor = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc.rect(40, y, 750, 20).fill(bgColor);

        x = 40;
        doc.fillColor('#0F172A');
        const rowData = [
          item.candidateName,
          item.candidateEmail,
          item.positionTitle,
          item.department,
          item.currentStage,
          item.status,
          item.appliedDate,
          item.aggregatedScore
        ];

        rowData.forEach((val, i) => {
          doc.text(String(val), x + 4, y + 5, { width: colWidths[i] - 6, lineBreak: false, ellipsis: true });
          x += colWidths[i];
        });

        y += 20;
      });

      doc.end();
    });
  }
}
