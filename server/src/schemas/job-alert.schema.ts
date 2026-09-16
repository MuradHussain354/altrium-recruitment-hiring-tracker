import { z } from 'zod';

export const jobAlertSubscriptionSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  department: z
    .string()
    .trim()
    .max(100, 'Department cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  keyword: z
    .string()
    .trim()
    .max(100, 'Keyword cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
});

export const unsubscribeJobAlertSchema = z.object({
  token: z
    .string({ required_error: 'Unsubscribe token is required' })
    .trim()
    .min(1, 'Unsubscribe token cannot be empty')
});

export type JobAlertSubscriptionInput = z.infer<typeof jobAlertSubscriptionSchema>;
export type UnsubscribeJobAlertInput = z.infer<typeof unsubscribeJobAlertSchema>;
