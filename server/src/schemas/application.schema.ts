import { z } from 'zod';
import { CandidateSource } from '@prisma/client';

export const candidateApplicationSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  linkedInUrl: z
    .string()
    .trim()
    .max(500, 'LinkedIn URL cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
    .refine(
      (val) => {
        if (val === undefined) return true;
        try {
          const url = new URL(val);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Invalid LinkedIn profile URL format' }
    ),
  notes: z
    .string()
    .trim()
    .max(2000, 'Application note cannot exceed 2000 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  source: z.nativeEnum(CandidateSource).optional().default(CandidateSource.Direct),
  positionId: z.string({ required_error: 'Position ID is required' }).uuid('Invalid position ID format')
});

export interface CandidateApplicationInput {
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedInUrl?: string;
  notes?: string;
  source?: CandidateSource;
  positionId: string;
}

export const trackApplicationSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  referenceId: z
    .string({ required_error: 'Reference ID is required' })
    .trim()
    .uuid('Invalid reference ID format')
});

export type TrackApplicationInput = z.infer<typeof trackApplicationSchema>;
