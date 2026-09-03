import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .trim()
    .min(1, 'Team name cannot be empty')
    .max(100, 'Team name must not exceed 100 characters')
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
