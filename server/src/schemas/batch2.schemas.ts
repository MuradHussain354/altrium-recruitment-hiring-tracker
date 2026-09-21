import { z } from 'zod';
import { ApplicationStatus, InvitationStatus, OfferApprovalStatus } from '@prisma/client';

export const bulkStatusSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1, 'At least one application must be selected'),
  status: z.nativeEnum(ApplicationStatus),
  statusReason: z.string().trim().max(500).optional()
});

export const bulkStageSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1, 'At least one application must be selected'),
  stageId: z.string().uuid('Valid target stageId is required')
});

export const bulkAssignTeamSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1, 'At least one application must be selected'),
  teamId: z.string().uuid().nullable()
});

export const createInternalNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content cannot be empty').max(5000, 'Note cannot exceed 5000 characters')
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50, 'Tag name cannot exceed 50 characters'),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #3B82F6)').optional().default('#3B82F6')
});

export const createSavedFilterSchema = z.object({
  name: z.string().trim().min(1, 'Filter name is required').max(100, 'Filter name cannot exceed 100 characters'),
  filterData: z.record(z.any())
});

export const updateSavedFilterSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  filterData: z.record(z.any()).optional()
});

export const questionItemSchema = z.object({
  questionText: z.string().trim().min(1, 'Question text cannot be empty').max(1000),
  sequenceOrder: z.number().int().min(0).optional().default(0),
  guidance: z.string().trim().max(2000).optional()
});

export const createQuestionSetSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional().default('General'),
  questions: z.array(questionItemSchema).min(1, 'At least one question is required')
});

export const updateQuestionSetSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  questions: z.array(questionItemSchema).optional()
});

export const invitationResponseSchema = z.object({
  status: z.enum([InvitationStatus.Accepted, InvitationStatus.Declined]),
  declineReason: z.string().trim().max(500).optional()
}).refine(data => {
  if (data.status === InvitationStatus.Declined && (!data.declineReason || data.declineReason.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'A decline reason is required when declining an invitation',
  path: ['declineReason']
});

export const delegateInterviewSchema = z.object({
  targetInterviewerId: z.string().uuid('Valid target interviewer ID is required')
});

export const requestOfferApprovalSchema = z.object({
  salaryOffered: z.number().positive('Salary must be positive').optional(),
  startDate: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional()
});

export const decideOfferApprovalSchema = z.object({
  decision: z.enum([OfferApprovalStatus.Approved, OfferApprovalStatus.Rejected]),
  notes: z.string().trim().max(2000).optional()
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content cannot be empty').max(3000)
});

export const structuredCriterionScoreSchema = z.object({
  criterionName: z.string().trim().min(1, 'Criterion name is required').max(150),
  weight: z.number().min(0.1, 'Weight must be at least 0.1').max(10, 'Weight cannot exceed 10.0').optional().default(1.0),
  score: z.number().min(1.0, 'Score must be at least 1.0').max(5.0, 'Score cannot exceed 5.0')
});

export const structuredFeedbackSchema = z.object({
  overallRating: z.number().min(1.0).max(5.0).optional(),
  comments: z.string().trim().max(5000).optional(),
  criterionScores: z.array(structuredCriterionScoreSchema).min(1, 'At least one structured criterion score is required')
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(100),
  type: z.enum(['all', 'candidates', 'positions', 'applications', 'interviews', 'teams']).optional().default('all')
});

export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type BulkStageInput = z.infer<typeof bulkStageSchema>;
export type BulkAssignTeamInput = z.infer<typeof bulkAssignTeamSchema>;
export type CreateInternalNoteInput = z.infer<typeof createInternalNoteSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;
export type UpdateSavedFilterInput = z.infer<typeof updateSavedFilterSchema>;
export type CreateQuestionSetInput = z.infer<typeof createQuestionSetSchema>;
export type UpdateQuestionSetInput = z.infer<typeof updateQuestionSetSchema>;
export type InvitationResponseInput = z.infer<typeof invitationResponseSchema>;
export type DelegateInterviewInput = z.infer<typeof delegateInterviewSchema>;
export type RequestOfferApprovalInput = z.infer<typeof requestOfferApprovalSchema>;
export type DecideOfferApprovalInput = z.infer<typeof decideOfferApprovalSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type StructuredCriterionScoreInput = z.infer<typeof structuredCriterionScoreSchema>;
export type StructuredFeedbackInput = z.infer<typeof structuredFeedbackSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
