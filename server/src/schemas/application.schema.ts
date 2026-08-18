import { z } from 'zod';
import { CandidateSource } from '@prisma/client';

export const candidateApplicationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase()),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  source: z.nativeEnum(CandidateSource).optional().default(CandidateSource.Direct),
  positionId: z.string().uuid('Invalid position ID format')
});

export interface CandidateApplicationInput {
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  source?: CandidateSource;
  positionId: string;
}
