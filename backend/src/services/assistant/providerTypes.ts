export const AI_PROVIDERS = ['openai', 'anthropic', 'groq', 'ollama'] as const;
export type AIProviderName = (typeof AI_PROVIDERS)[number];

export interface ProviderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderCompletionInput {
  model: string;
  system: string;
  messages: ProviderMessage[];
}

export interface ProviderAdapter {
  readonly name: AIProviderName;
  readonly destination: string;
  readonly isCloud: boolean;
  hasCredential(): boolean;
  verifyModel(model: string, signal: AbortSignal): Promise<void>;
  testConnection(model: string, signal: AbortSignal): Promise<void>;
  streamCompletion(
    input: ProviderCompletionInput,
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<void>;
}

export type ProviderErrorCode =
  | 'AI_AUTHENTICATION_FAILED'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_UNREACHABLE'
  | 'AI_INVALID_RESPONSE'
  | 'AI_PROVIDER_FAILED'
  | 'AI_OUTPUT_LIMIT'
  | 'AI_INVALID_DESTINATION';

const ERROR_MESSAGES: Record<ProviderErrorCode, string> = {
  AI_AUTHENTICATION_FAILED:
    'The provider rejected its credential. Check the saved key or server environment key.',
  AI_MODEL_NOT_FOUND: 'The configured model is unavailable. Check its name or install it locally.',
  AI_RATE_LIMITED: 'The provider rate limit or quota was reached. Try again later.',
  AI_TIMEOUT: 'The provider did not respond before the request timed out.',
  AI_PROVIDER_UNREACHABLE: 'The provider could not be reached. Check its service and network.',
  AI_INVALID_RESPONSE: 'The provider returned an invalid response. Check the model and try again.',
  AI_PROVIDER_FAILED:
    'The provider could not complete the request. Try again or test the connection.',
  AI_OUTPUT_LIMIT: 'The response exceeded the allowed length and was stopped.',
  AI_INVALID_DESTINATION:
    'The configured Ollama destination is invalid. Use localhost or host.docker.internal over HTTP.',
};

export class AIProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message = ERROR_MESSAGES[code],
    public readonly httpStatus = 502,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
