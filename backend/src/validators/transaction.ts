import { z } from 'zod';
import { TRANSACTION_TYPES } from '../utils/constants';

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

export const createTransactionSchema = z
  .object({
    amount: moneyAmount,
    date: validDate,
    description: z.string().trim().min(1).max(500),
    merchant: z.string().max(200).optional(),
    categoryId: z.number().int().positive().optional().nullable(),
    accountId: z.number().int().positive().optional().nullable(),
    type: z.enum(TRANSACTION_TYPES).optional().default('expense'),
    isRecurring: z.boolean().optional().default(false),
    notes: z.string().max(1000).optional(),
    externalId: z.string().max(100).optional(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    amount: moneyAmount.optional(),
    date: validDate.optional(),
    description: z.string().trim().min(1).max(500).optional(),
    merchant: z.string().max(200).optional().nullable(),
    categoryId: z.number().int().positive().optional().nullable(),
    accountId: z.number().int().positive().optional().nullable(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    isRecurring: z.boolean().optional(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .strict();

export const transactionFilterSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    accountId: z.coerce.number().int().positive().optional(),
    startDate: validDate.optional(),
    endDate: validDate.optional(),
    minAmount: z.coerce.number().finite().min(0).max(999_999_999_999.99).optional(),
    maxAmount: z.coerce.number().finite().min(0).max(999_999_999_999.99).optional(),
    search: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).max(1_000_000).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .strict()
  .superRefine((values, context) => {
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after start date',
      });
    }
    if (
      values.minAmount !== undefined &&
      values.maxAmount !== undefined &&
      values.minAmount > values.maxAmount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxAmount'],
        message: 'Maximum amount must be at least the minimum amount',
      });
    }
  });

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
