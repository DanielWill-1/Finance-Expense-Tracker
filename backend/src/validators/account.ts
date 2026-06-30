import { z } from 'zod';
import { ACCOUNT_TYPES } from '../utils/constants';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES).optional().default('bank'),
  balance: z.number().optional().default(0),
  currency: z.string().max(10).optional().default('INR'),
  isActive: z.boolean().optional().default(true),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  balance: z.number().optional(),
  currency: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
