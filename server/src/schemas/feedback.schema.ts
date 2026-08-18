import { z } from 'zod';

export const interviewFeedbackParamSchema = z.object({
  interviewId: z.string().uuid('Invalid interview ID format')
});

export const feedbackCriterionScoreInputSchema = z.object({
  criterionName: z.string().min(1, 'Criterion name is required'),
  weight:        z.number().min(0, 'Weight must be non-negative').max(99.99, 'Weight exceeds maximum precision').optional(),
  score:         z.number().min(0, 'Score must be non-negative').max(99.99, 'Score exceeds maximum precision')
});

export const submitFeedbackSchema = z.object({
  overallRating:   z.number().min(0, 'Overall rating must be non-negative').max(99.9, 'Overall rating exceeds maximum precision').optional(),
  comments:        z.string().optional(),
  criterionScores: z.array(feedbackCriterionScoreInputSchema).optional()
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type FeedbackCriterionScoreInput = z.infer<typeof feedbackCriterionScoreInputSchema>;
