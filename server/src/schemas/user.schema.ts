import { z } from 'zod';
import { Role } from '@prisma/client';

export const createManagedUserSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum([Role.HR, Role.TeamLead], {
    required_error: 'Role is required and must be either HR or TeamLead'
  }),
  teamId: z.string().uuid('Invalid team ID format').optional().nullable()
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});

export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
