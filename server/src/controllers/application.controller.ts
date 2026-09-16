import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { candidateApplicationSchema, trackApplicationSchema } from '../schemas/application.schema';
import { StorageService } from '../services/storage.service';
import { AppError } from '../utils/errors';

export class ApplicationController {
  /**
   * POST /api/v1/public/applications (Public Candidate Submission with CV File Upload)
   */
  static async submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    let uploadedPublicId: string | null = null;

    try {
      let resumeUrl: string | undefined = undefined;

      // 1. Process CV upload or legacy URL fallback
      if (req.file) {
        const uploadResult = await StorageService.uploadCv(req.file);
        resumeUrl = uploadResult.secureUrl;
        uploadedPublicId = uploadResult.publicId;
      } else if (req.body.resumeUrl && typeof req.body.resumeUrl === 'string' && req.body.resumeUrl.trim()) {
        resumeUrl = req.body.resumeUrl.trim();
      } else {
        throw new AppError(400, 'CV / Resume file is required.');
      }

      // 2. Validate request payload
      const payloadToValidate = {
        ...req.body,
        resumeUrl
      };

      const parsed = candidateApplicationSchema.safeParse(payloadToValidate);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      // 3. Delegate to ApplicationService
      const application = await ApplicationService.submitApplication(parsed.data);

      res.status(201).json({
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      // 4. Safe upload cleanup: If upload succeeded but subsequent processing failed, clean up orphaned CV
      if (uploadedPublicId) {
        try {
          await StorageService.deleteCv(uploadedPublicId);
        } catch (cleanupErr) {
          console.warn('[ApplicationController] Failed to cleanup orphaned upload:', cleanupErr);
        }
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/public/applications/track (Public Application Tracking)
   */
  static async trackApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = trackApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.errors.map((e) => e.message).join(', ');
        throw new AppError(400, message);
      }

      const trackingDetails = await ApplicationService.trackApplication(parsed.data);

      res.status(200).json({
        message: 'Application tracking details retrieved successfully',
        data: trackingDetails
      });
    } catch (error) {
      next(error);
    }
  }
}
