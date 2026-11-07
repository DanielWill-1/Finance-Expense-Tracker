import { z } from 'zod';
import { IMPORT_STATUS } from '../utils/constants';

const validDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Date must be a real date in YYYY-MM-DD format');
const moneyAmount = z
  .number()
  .finite()
  .positive()
  .max(999_999_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    'Amount supports at most two decimal places',
  );

export const importCommitSchema = z
  .object({
    rows: z
      .array(
        z
          .object({
            date: validDate,
            description: z.string().trim().min(1).max(500),
            amount: moneyAmount,
            type: z.enum(['income', 'expense']),
            merchant: z.string().max(200).nullable().optional(),
            categoryId: z.number().int().positive().nullable().optional(),
            externalId: z.string().max(100).nullable().optional(),
            keepDuplicate: z.boolean().optional().default(false),
          })
          .strict(),
      )
      .min(1)
      .max(25000),
    accountId: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const importHistoryQuerySchema = z.object({
  status: z.enum(IMPORT_STATUS).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v > 0),
      'Page must be a positive integer',
    ),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v > 0 && v <= 200),
      'Limit must be between 1 and 200',
    ),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
