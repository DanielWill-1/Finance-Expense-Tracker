import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { sendError, sendSuccess } from '../utils/response';
import { AssistantService } from '../services/assistant/assistantService';
import { localCredentialStore } from '../services/assistant/credentialStore';
import {
  assistantChatSchema,
  assistantCredentialProviderSchema,
  assistantCredentialSchema,
  assistantTestSchema,
} from '../validators/assistant';

function event(res: Response, name: string, data: unknown) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

export class AssistantController {
  constructor(
    private readonly service = new AssistantService(),
    private readonly credentials = localCredentialStore,
  ) {}

  status = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await this.service.getStatus());
    } catch (error) {
      next(error);
    }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    const parsed = assistantTestSchema.safeParse(req.body ?? {});
    if (!parsed.success)
      return sendError(res, 'Invalid connection test request', 400, 'VALIDATION_ERROR');
    try {
      sendSuccess(res, await this.service.testConnection());
    } catch (error) {
      next(error);
    }
  };

  credentialStatus = async (req: Request, res: Response, next: NextFunction) => {
    const parsedProvider = assistantCredentialProviderSchema.safeParse(req.params.provider);
    if (!parsedProvider.success)
      return sendError(
        res,
        'Choose OpenAI, Anthropic, or Groq to manage an API key',
        400,
        'VALIDATION_ERROR',
      );
    try {
      const source = this.credentials.getSource(parsedProvider.data);
      sendSuccess(res, {
        provider: parsedProvider.data,
        configured: source !== null,
        source,
      });
    } catch {
      next(
        new AppError(
          'The local AI credential store is unavailable.',
          500,
          'CREDENTIAL_STORE_ERROR',
        ),
      );
    }
  };

  saveCredential = async (req: Request, res: Response, next: NextFunction) => {
    const parsedProvider = assistantCredentialProviderSchema.safeParse(req.params.provider);
    const parsedCredential = assistantCredentialSchema.safeParse(req.body);
    if (!parsedProvider.success)
      return sendError(
        res,
        'Choose OpenAI, Anthropic, or Groq to manage an API key',
        400,
        'VALIDATION_ERROR',
      );
    if (!parsedCredential.success)
      return sendError(res, 'Enter a valid API key', 400, 'VALIDATION_ERROR');
    try {
      this.credentials.save(parsedProvider.data, parsedCredential.data.apiKey);
      sendSuccess(res, {
        provider: parsedProvider.data,
        configured: true,
        source: 'settings' as const,
      });
    } catch {
      next(
        new AppError(
          'The local AI credential store could not be updated.',
          500,
          'CREDENTIAL_STORE_ERROR',
        ),
      );
    }
  };

  removeCredential = async (req: Request, res: Response, next: NextFunction) => {
    const parsedProvider = assistantCredentialProviderSchema.safeParse(req.params.provider);
    if (!parsedProvider.success)
      return sendError(
        res,
        'Choose OpenAI, Anthropic, or Groq to manage an API key',
        400,
        'VALIDATION_ERROR',
      );
    try {
      this.credentials.remove(parsedProvider.data);
      const source = this.credentials.getSource(parsedProvider.data);
      sendSuccess(res, {
        provider: parsedProvider.data,
        configured: source !== null,
        source,
      });
    } catch {
      next(
        new AppError(
          'The local AI credential store could not be updated.',
          500,
          'CREDENTIAL_STORE_ERROR',
        ),
      );
    }
  };

  chat = async (req: Request, res: Response, next: NextFunction) => {
    const parsed = assistantChatSchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );

    try {
      const prepared = this.service.prepareChat(parsed.data.question, parsed.data.history);
      const abortController = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded)
          abortController.abort(new DOMException('Client disconnected', 'AbortError'));
      });
      res.status(200);
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      event(res, 'meta', prepared.metadata);
      try {
        await this.service.stream(prepared, abortController.signal, (text) =>
          event(res, 'delta', { text }),
        );
        event(res, 'done', { status: 'completed' });
      } catch (error) {
        if (abortController.signal.aborted || res.destroyed) return;
        const appError =
          error instanceof AppError
            ? error
            : new AppError(
                'The assistant request failed. Try again or test the connection.',
                502,
                'AI_PROVIDER_FAILED',
              );
        event(res, 'error', { code: appError.code, message: appError.message });
      }
      res.end();
    } catch (error) {
      if (res.headersSent) {
        event(res, 'error', {
          code: 'AI_PROVIDER_FAILED',
          message: 'The assistant request failed. Try again.',
        });
        res.end();
      } else {
        next(error);
      }
    }
  };
}
