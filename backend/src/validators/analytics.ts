import { z } from 'zod';

export const analyticsSummaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.coerce.number().int().positive().optional(),
});

export const analyticsMonthlyQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  months: z.coerce.number().int().min(1).max(24).optional(),
  accountId: z.coerce.number().int().positive().optional(),
});

export const analyticsCategoriesQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  accountId: z.coerce.number().int().positive().optional(),
});
