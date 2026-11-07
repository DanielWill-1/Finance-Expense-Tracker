import { z } from 'zod';

export const settingsUpdateSchema = z
  .object({
    ai_provider: z.enum(['openai', 'anthropic', 'groq', 'ollama']).optional(),
    ai_model: z.string().max(100).optional(),
    ai_endpoint: z.string().url().max(300).optional(),
    theme: z.enum(['dark', 'light']).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    language: z
      .string()
      .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
      .optional(),
  })
  .strict();

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
