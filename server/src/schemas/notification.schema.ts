import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID format')
});

export const listNotificationsSchema = z.object({
  type: z.nativeEnum(NotificationType, { errorMap: () => ({ message: 'Invalid notification type' }) }).optional(),
  limit: z.coerce.number().int().positive('Limit must be a positive integer').optional(),
  offset: z.coerce.number().int().nonnegative('Offset must be a non-negative integer').optional()
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
