import { z } from 'zod';

export const idParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const sortQuerySchema = z
  .object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const accountListQuerySchema = paginationQuerySchema.merge(sortQuerySchema);
export const categoryListQuerySchema = paginationQuerySchema.merge(sortQuerySchema).extend({
  type: z.enum(['income', 'expense']).optional(),
});
