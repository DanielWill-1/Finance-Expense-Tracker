import { z } from 'zod';
import { IMPORT_STATUS } from '../utils/constants';

export const importHistoryQuerySchema = z.object({
  status: z.enum(IMPORT_STATUS).optional(),
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
