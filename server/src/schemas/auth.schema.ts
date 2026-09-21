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

export const enable2FASchema = z.object({
  code: z
    .string({ required_error: 'Verification code is required' })
    .min(1, 'Verification code is required')
    .trim(),
});
export type Enable2FAInput = z.infer<typeof enable2FASchema>;

export const disable2FASchema = z.object({
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
  code: z
    .string({ required_error: 'Authentication code is required' })
    .min(1, 'Authentication code is required')
    .trim(),
});
export type Disable2FAInput = z.infer<typeof disable2FASchema>;

export const regenerateBackupCodesSchema = z.object({
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
  code: z
    .string({ required_error: 'TOTP code is required' })
    .min(1, 'TOTP code is required')
    .trim(),
});
export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;

export const verify2FALoginSchema = z.object({
  tempToken: z
    .string({ required_error: 'Temporary 2FA token is required' })
    .min(1, 'Temporary 2FA token is required')
    .trim(),
  code: z
    .string({ required_error: 'Authentication code is required' })
    .min(1, 'Authentication code is required')
    .trim(),
});
export type Verify2FALoginInput = z.infer<typeof verify2FALoginSchema>;

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
