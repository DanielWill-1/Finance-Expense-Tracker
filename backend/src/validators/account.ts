import { z } from 'zod';
import { ACCOUNT_TYPES } from '../utils/constants';
const balanceValue = z
  .number()
  .finite()
  .min(-999_999_999_999.99)
  .max(999_999_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    'Balance supports at most two decimal places',
  );

export const createAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(ACCOUNT_TYPES).optional().default('bank'),
    balance: balanceValue.optional().default(0),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional()
      .default('INR'),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.enum(ACCOUNT_TYPES).optional(),
    balance: balanceValue.optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateAccountInput = z.input<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
