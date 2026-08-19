import { z } from 'zod';

export const reportFilterSchema = z.object({
  dateFrom: z.coerce.date({ errorMap: () => ({ message: 'dateFrom must be a valid date' }) }).optional(),
  dateTo: z.coerce.date({ errorMap: () => ({ message: 'dateTo must be a valid date' }) }).optional(),
  department: z.string().trim().min(1, 'Department must not be empty').optional(),
  positionId: z.string().uuid('Invalid position ID format').optional()
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return data.dateFrom <= data.dateTo;
    }
    return true;
  },
  { message: 'dateFrom must be before or equal to dateTo' }
);

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
