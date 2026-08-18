import { z } from 'zod';
import { PositionStatus } from '@prisma/client';

export const createPositionSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requiredSkills: z.string().optional(),
  headcount: z.number().int().positive('Headcount must be a positive integer').optional().default(1),
  status: z.nativeEnum(PositionStatus).optional().default(PositionStatus.Draft),
  pipelineTemplateId: z.string().uuid('Invalid pipeline template ID format').optional()
});

export const updatePositionSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').optional(),
  department: z.string().min(2, 'Department must be at least 2 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  requiredSkills: z.string().optional(),
  headcount: z.number().int().positive('Headcount must be a positive integer').optional(),
  pipelineTemplateId: z.string().uuid('Invalid pipeline template ID format').optional()
});

export const updatePositionStatusSchema = z.object({
  status: z.nativeEnum(PositionStatus, {
    errorMap: () => ({ message: 'Invalid position status. Allowed: Draft, Open, OnHold, Closed' })
  })
});

export const publicPositionQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional()
});

export interface CreatePositionInput {
  title: string;
  department: string;
  description: string;
  requiredSkills?: string;
  headcount?: number;
  status?: PositionStatus;
  pipelineTemplateId?: string;
}

export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type UpdatePositionStatusInput = z.infer<typeof updatePositionStatusSchema>;
export type PublicPositionQueryInput = z.infer<typeof publicPositionQuerySchema>;
