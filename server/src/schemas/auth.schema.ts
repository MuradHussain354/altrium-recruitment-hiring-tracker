import { z } from 'zod';

/**
 * Strong password policy shared by every flow that lets a user choose their own
 * password (currently: account invitation acceptance).
 */
export const strongPasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Account Invitation (S2-45) ──────────────────────────────────────────────

export const invitationDetailsQuerySchema = z.object({
  token: z
    .string({ required_error: 'Invitation token is required' })
    .min(1, 'Invitation token is required'),
});
export type InvitationDetailsQuery = z.infer<typeof invitationDetailsQuerySchema>;

export const acceptInvitationSchema = z.object({
  token: z
    .string({ required_error: 'Invitation token is required' })
    .min(1, 'Invitation token is required'),
  password: strongPasswordSchema,
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
