import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/v1/health
 * Public health check endpoint for verifying API status.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Altrium Recruitment & Hiring Tracker API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
