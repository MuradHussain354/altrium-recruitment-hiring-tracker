import { z } from 'zod';

// PATCH /api/v1/applications/:applicationId/team
export const assignTeamBodySchema = z.object({
  teamId: z.string().uuid('Invalid team ID format')
});

// Reuse application ID param shape (mirrors application-management.schema.ts convention)
export const teamApplicationParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format')
});

export type AssignTeamInput = z.infer<typeof assignTeamBodySchema>;
