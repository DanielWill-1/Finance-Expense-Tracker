import { z } from 'zod';

export const assistantChatSchema = z
  .object({
    question: z.string().trim().min(1).max(1000),
    history: z
      .array(
        z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(800) }).strict(),
      )
      .max(6)
      .default([]),
  })
  .strict()
  .superRefine((request, context) => {
    const total =
      request.question.length + request.history.reduce((sum, item) => sum + item.content.length, 0);
    if (total > 6000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['history'],
        message: 'Chat context exceeds the 6,000 character limit',
      });
    }
  });

export const assistantTestSchema = z.object({}).strict();

export const assistantCredentialProviderSchema = z.enum(['openai', 'anthropic', 'groq']);

export const assistantCredentialSchema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine(
        (value) =>
          !value.split('').some((character) => {
            const code = character.charCodeAt(0);
            return code < 32 || code === 127;
          }),
        'API key contains invalid characters',
      ),
  })
  .strict();
