import { z } from 'zod';

const textCondition = z.string().trim().min(1).max(128).nullable().optional();

const regexCondition = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .nullable()
  .optional()
  .superRefine((value, context) => {
    if (!value) return;
    if (/\\[1-9]|\\k<|\(\?/.test(value) || /\([^)]*[+*][^)]*\)[+*{]/.test(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Regex uses an unsupported construct',
      });
      return;
    }
    try {
      new RegExp(value, 'i');
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Regex is not valid' });
    }
  });

const ruleFields = {
  priority: z.number().int().min(-10000).max(10000).optional(),
  containsText: textCondition,
  startsWith: textCondition,
  endsWith: textCondition,
  regex: regexCondition,
  categoryId: z.number().int().positive(),
  enabled: z.boolean().optional().default(true),
};

function hasCondition(rule: {
  containsText?: string | null | undefined;
  startsWith?: string | null | undefined;
  endsWith?: string | null | undefined;
  regex?: string | null | undefined;
}) {
  return Boolean(rule.containsText || rule.startsWith || rule.endsWith || rule.regex);
}

export const createRuleSchema = z
  .object(ruleFields)
  .strict()
  .refine(hasCondition, 'At least one match condition is required');

export const updateRuleSchema = z
  .object({
    priority: ruleFields.priority,
    containsText: ruleFields.containsText,
    startsWith: ruleFields.startsWith,
    endsWith: ruleFields.endsWith,
    regex: ruleFields.regex,
    categoryId: z.number().int().positive().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export { hasCondition };
