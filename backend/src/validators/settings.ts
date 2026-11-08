import { z } from 'zod';

export const settingsUpdateSchema = z
  .object({
    ai_provider: z.enum(['openai', 'anthropic', 'groq', 'ollama']).optional(),
    ai_model: z.string().trim().max(100).optional(),
    ai_enabled: z.boolean().optional(),
    ai_cloud_consent_provider: z.enum(['openai', 'anthropic', 'groq']).nullable().optional(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (
      settings.ai_cloud_consent_provider &&
      settings.ai_provider &&
      settings.ai_cloud_consent_provider !== settings.ai_provider
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ai_cloud_consent_provider'],
        message: 'Cloud consent must match the selected provider',
      });
    }
  });

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
