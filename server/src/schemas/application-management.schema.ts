import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

// GET /api/v1/applications — optional query filters
export const listApplicationsSchema = z.object({
  positionId: z.string().uuid('Invalid positionId filter format').optional(),
  stageId:    z.string().uuid('Invalid stageId filter format').optional(),
  status:     z.nativeEnum(ApplicationStatus).optional(),
  search:     z.string().min(1, 'Search term cannot be empty').max(100, 'Search term too long').optional()
});

// Path param shared by all /:applicationId routes
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format')
});

// PATCH /:applicationId/stage body
export const changeStageSchema = z.object({
  stageId: z.string().uuid('Invalid stage ID format')
});

// PATCH /:applicationId/status body
export const changeStatusSchema = z.object({
  status:       z.nativeEnum(ApplicationStatus, { errorMap: () => ({ message: 'Invalid application status value' }) }),
  statusReason: z.string().max(500, 'Status reason must not exceed 500 characters').optional()
});

export type ListApplicationsInput   = z.infer<typeof listApplicationsSchema>;
export type ChangeStageInput        = z.infer<typeof changeStageSchema>;
export type ChangeStatusInput       = z.infer<typeof changeStatusSchema>;
