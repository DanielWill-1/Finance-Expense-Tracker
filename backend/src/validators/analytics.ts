import { z } from 'zod';

const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Date must be a real date in YYYY-MM-DD format');

const accountId = z.coerce.number().int().positive().optional();
const dateRange = {
  startDate: date.optional(),
  endDate: date.optional(),
  accountId,
};

function orderedRange(
  value: { startDate?: string | undefined; endDate?: string | undefined },
  context: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be on or after start date',
    });
  }
}

export const analyticsSummaryQuerySchema = z.object(dateRange).strict().superRefine(orderedRange);

export const analyticsMonthlyQuerySchema = z
  .object({
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    months: z.coerce.number().int().min(1).max(24).optional(),
    accountId,
  })
  .strict();

export const analyticsCategoriesQuerySchema = z
  .object({
    ...dateRange,
    type: z.enum(['income', 'expense']).optional(),
  })
  .strict()
  .superRefine(orderedRange);

export const analyticsWeeksQuerySchema = z
  .object({
    weeks: z.coerce.number().int().min(1).max(52).default(12),
    accountId,
  })
  .strict();

export const analyticsMonthsQuerySchema = z
  .object({ months: z.coerce.number().int().min(1).max(24).default(6) })
  .strict();
export const analyticsLimitQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(10) })
  .strict();
