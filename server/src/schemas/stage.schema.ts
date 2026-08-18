import { z } from 'zod';

export const createStageSchema = z.object({
  name: z.string().min(2, 'Stage name must be at least 2 characters'),
  sequenceOrder: z.number().int().min(1, 'Sequence order must be a positive integer').optional(),
  isGating: z.boolean().optional().default(true),
  feedbackRequiredCount: z.number().int().min(0, 'Feedback required count cannot be negative').optional().default(1)
});

export const updateStageSchema = z.object({
  name: z.string().min(2, 'Stage name must be at least 2 characters').optional(),
  isGating: z.boolean().optional(),
  feedbackRequiredCount: z.number().int().min(0, 'Feedback required count cannot be negative').optional()
});

export const reorderStageItemSchema = z.object({
  stageId: z.string().uuid('Invalid stage ID format'),
  sequenceOrder: z.number().int().min(1, 'Sequence order must be a positive integer')
});

export const reorderStagesSchema = z.object({
  stages: z.array(reorderStageItemSchema).min(1, 'Reorder payload must contain at least one stage')
});

export interface CreateStageInput {
  name: string;
  sequenceOrder?: number;
  isGating?: boolean;
  feedbackRequiredCount?: number;
}

export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
