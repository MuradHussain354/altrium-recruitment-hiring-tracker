import { z } from 'zod';
import { InterviewStatus } from '@prisma/client';

// Shared param schemas
export const interviewApplicationParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format')
});

export const interviewIdParamSchema = z.object({
  interviewId: z.string().uuid('Invalid interview ID format')
});

// POST /api/v1/applications/:applicationId/interviews
export const createInterviewSchema = z.object({
  stageId:         z.string().uuid('Invalid stage ID format'),
  scheduledAt:     z.coerce
                     .date({ errorMap: () => ({ message: 'scheduledAt must be a valid ISO datetime' }) })
                     .refine((d) => d > new Date(), { message: 'scheduledAt must be in the future' }),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  location:        z.string().max(255, 'Location must not exceed 255 characters').optional(),
  meetingLink:     z.string().url('meetingLink must be a valid URL').optional(),
  questionSetId:   z.string().uuid('Invalid question set ID format').nullable().optional(),
  interviewerIds:  z.array(z.string().uuid('Each interviewer ID must be a valid UUID'))
                     .min(1, 'At least one interviewer is required')
});

// PATCH /api/v1/interviews/:interviewId
export const updateInterviewSchema = z.object({
  scheduledAt:     z.coerce.date({ errorMap: () => ({ message: 'scheduledAt must be a valid ISO datetime' }) }).optional(),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  location:        z.string().max(255, 'Location must not exceed 255 characters').optional(),
  meetingLink:     z.string().url('meetingLink must be a valid URL').optional(),
  questionSetId:   z.string().uuid('Invalid question set ID format').nullable().optional()
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided for update' }
);

// PATCH /api/v1/interviews/:interviewId/status
export const updateInterviewStatusSchema = z.object({
  status: z.nativeEnum(InterviewStatus, { errorMap: () => ({ message: 'Invalid interview status value' }) })
});

// PUT /api/v1/interviews/:interviewId/interviewers
export const updateInterviewersSchema = z.object({
  interviewerIds: z.array(z.string().uuid('Each interviewer ID must be a valid UUID'))
                    .min(1, 'At least one interviewer is required')
});

// GET /api/v1/interviews (query filters)
export const listInterviewsSchema = z.object({
  applicationId: z.string().uuid('Invalid applicationId filter format').optional(),
  status:        z.nativeEnum(InterviewStatus).optional(),
  from:          z.coerce.date().optional(),
  to:            z.coerce.date().optional()
});

export type CreateInterviewInput        = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput        = z.infer<typeof updateInterviewSchema>;
export type UpdateInterviewStatusInput  = z.infer<typeof updateInterviewStatusSchema>;
export type UpdateInterviewersInput     = z.infer<typeof updateInterviewersSchema>;
export type ListInterviewsInput         = z.infer<typeof listInterviewsSchema>;
