import { z } from 'zod';
import { CATEGORY_TYPES } from '../utils/constants';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(CATEGORY_TYPES).optional().default('expense'),
  parentId: z.number().int().positive().optional().nullable(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  parentId: z.number().int().positive().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
