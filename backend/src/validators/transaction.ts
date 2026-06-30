import { z } from 'zod';
import { TRANSACTION_TYPES } from '../utils/constants';

export const createTransactionSchema = z.object({
  amount: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1).max(500),
  merchant: z.string().max(200).optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
  type: z.enum(TRANSACTION_TYPES).optional().default('expense'),
  isRecurring: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional(),
  externalId: z.string().max(100).optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  description: z.string().min(1).max(500).optional(),
  merchant: z.string().max(200).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  isRecurring: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const transactionFilterSchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
