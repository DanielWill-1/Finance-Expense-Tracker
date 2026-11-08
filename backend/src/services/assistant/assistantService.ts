import { AppError } from '../../utils/errors';
import { SettingsRepository } from '../../repositories/settingsRepository';
import { AssistantContextService, type AssistantHistoryMessage } from './assistantContextService';
import { createProviderAdapters } from './providerAdapters';
import { providerCredentialSource } from './credentialStore';
import {
  AIProviderError,
  type AIProviderName,
  type ProviderAdapter,
  type ProviderCompletionInput,
} from './providerTypes';

export type AssistantState =
  'disabled' | 'unconfigured' | 'untested' | 'ready' | 'unreachable' | 'failed';

export interface AssistantStatus {
  state: AssistantState;
  provider: AIProviderName;
  model: string;
  enabled: boolean;
  mode: 'local' | 'cloud';
  destination: string;
  credentialConfigured: boolean;
  credentialSource: 'settings' | 'environment' | 'not_required' | null;
  cloudConsent: boolean;
  serverReachable: boolean | null;
  modelAvailable: boolean | null;
  testedAt: string | null;
  message: string;
  errorCode?: string;
}

interface TestResult {
  state: 'ready' | 'unreachable' | 'failed';
  testedAt: string;
  code?: string;
  message?: string;
}

export interface PreparedChat {
  adapter: ProviderAdapter;
  input: ProviderCompletionInput;
  metadata: ReturnType<AssistantContextService['build']>['metadata'];
  clarification?: string;
}

function abortAfter(milliseconds: number): {
  signal: AbortSignal;
  abort: (reason?: unknown) => void;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('Provider timeout', 'TimeoutError')),
    milliseconds,
  );
  return {
    signal: controller.signal,
    abort: (reason) => controller.abort(reason),
    dispose: () => clearTimeout(timer),
  };
}

function errorDetails(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof AIProviderError)
    return { code: error.code, message: error.message, status: error.httpStatus };
  if (error instanceof Error && error.name === 'TimeoutError')
    return {
      code: 'AI_TIMEOUT',
      message: 'The provider did not respond before the request timed out.',
      status: 504,
    };
  if (error instanceof Error && error.name === 'AbortError')
    return { code: 'AI_CANCELLED', message: 'The request was cancelled.', status: 499 };
  return {
    code: 'AI_PROVIDER_UNREACHABLE',
    message: 'The provider could not be reached. Check its service and network.',
    status: 503,
  };
}

export class AssistantService {
  private readonly settings = new SettingsRepository();
  private readonly context = new AssistantContextService();
  private readonly adapters = createProviderAdapters();
  private readonly tests = new Map<string, TestResult>();

  private preference(key: string): string | undefined {
    return this.settings.getByKey(key)?.value;
  }

  private currentConfig() {
    const configuredProvider = this.preference('ai_provider');
    const provider: AIProviderName =
      configuredProvider === 'anthropic' ||
      configuredProvider === 'groq' ||
      configuredProvider === 'ollama'
        ? configuredProvider
        : 'openai';
    const model = this.preference('ai_model')?.trim() ?? '';
    const enabled = this.preference('ai_enabled') === 'true';
    const consentProvider = this.preference('ai_cloud_consent_provider');
    const adapter = this.adapters[provider];
    return {
      provider,
      model,
      enabled,
      consentProvider,
      adapter,
      cloudConsent: !adapter.isCloud || consentProvider === provider,
      testKey: `${provider}:${model}`,
    };
  }

  async getStatus(): Promise<AssistantStatus> {
    const config = this.currentConfig();
    const test = this.tests.get(config.testKey);
    const liveTest =
      test && Date.now() - Date.parse(test.testedAt) < 15 * 60_000 ? test : undefined;
    let serverReachable: boolean | null = null;
    let modelAvailable: boolean | null = null;
    let state: AssistantState;
    let message = '';
    let errorCode: string | undefined;

    if (!config.enabled) {
      state = 'disabled';
      message = 'AI analysis is disabled. Enable it to use the assistant.';
    } else if (!config.model || !config.adapter.hasCredential()) {
      state = 'unconfigured';
      message = !config.model
        ? 'Choose a model before testing the connection.'
        : 'Add a provider API key in Settings or configure it in the server environment.';
    } else if (config.provider === 'ollama') {
      const timeout = abortAfter(2_500);
      try {
        await config.adapter.verifyModel(config.model, timeout.signal);
        serverReachable = true;
        modelAvailable = true;
        if (liveTest?.state === 'ready') {
          state = 'ready';
          message = 'The local server and selected model passed a connection test.';
        } else if (liveTest) {
          state = liveTest.state;
          message = liveTest.message ?? 'The last connection test failed.';
          errorCode = liveTest.code;
        } else {
          state = 'untested';
          message =
            'The local server and model are available. Test the connection before chatting.';
        }
      } catch (error) {
        const details = errorDetails(error);
        serverReachable =
          details.code === 'AI_INVALID_DESTINATION'
            ? null
            : details.code !== 'AI_PROVIDER_UNREACHABLE' && details.code !== 'AI_TIMEOUT';
        modelAvailable =
          serverReachable === null || !serverReachable
            ? null
            : details.code === 'AI_MODEL_NOT_FOUND'
              ? false
              : true;
        state =
          details.code === 'AI_PROVIDER_UNREACHABLE' || details.code === 'AI_TIMEOUT'
            ? 'unreachable'
            : details.code === 'AI_MODEL_NOT_FOUND'
              ? 'unconfigured'
              : 'failed';
        message =
          details.code === 'AI_MODEL_NOT_FOUND'
            ? 'The Ollama server is reachable, but the selected model is not installed.'
            : details.message;
        errorCode = details.code;
      } finally {
        timeout.dispose();
      }
    } else if (liveTest) {
      state = liveTest.state;
      message =
        liveTest.message ??
        (state === 'ready' ? 'Connection test passed.' : 'The last connection test failed.');
      errorCode = liveTest.code;
      serverReachable = state !== 'unreachable';
    } else {
      state = 'untested';
      message =
        'Provider settings and credentials are present. Test the connection before chatting.';
    }

    if (
      config.enabled &&
      config.adapter.isCloud &&
      !config.cloudConsent &&
      (state === 'ready' || state === 'untested')
    ) {
      message = `Cloud consent is required before sending your question and relevant ledger context to ${config.provider}.`;
    }

    return {
      state,
      provider: config.provider,
      model: config.model,
      enabled: config.enabled,
      mode: config.adapter.isCloud ? 'cloud' : 'local',
      destination: config.adapter.destination,
      credentialConfigured: config.adapter.hasCredential(),
      credentialSource:
        config.provider === 'ollama' ? 'not_required' : providerCredentialSource(config.provider),
      cloudConsent: config.cloudConsent,
      serverReachable,
      modelAvailable,
      testedAt: liveTest?.testedAt ?? null,
      message,
      ...(errorCode ? { errorCode } : {}),
    };
  }

  async testConnection() {
    const config = this.currentConfig();
    const testedAt = new Date().toISOString();
    try {
      if (!config.model)
        throw new AppError(
          'Choose a model before testing the connection.',
          400,
          'AI_NOT_CONFIGURED',
        );
      if (!config.adapter.hasCredential())
        throw new AppError(
          'Add a provider API key in Settings or configure it in the server environment.',
          400,
          'AI_NOT_CONFIGURED',
        );
      const timeout = abortAfter(20_000);
      try {
        await config.adapter.testConnection(config.model, timeout.signal);
      } finally {
        timeout.dispose();
      }
      this.tests.set(config.testKey, { state: 'ready', testedAt });
      return {
        state: 'ready' as const,
        provider: config.provider,
        model: config.model,
        testedAt,
        message: 'Connection test passed. No ledger data was sent.',
      };
    } catch (error) {
      const details = errorDetails(error);
      const state =
        details.code === 'AI_PROVIDER_UNREACHABLE' || details.code === 'AI_TIMEOUT'
          ? 'unreachable'
          : 'failed';
      this.tests.set(config.testKey, {
        state,
        testedAt,
        code: details.code,
        message: details.message,
      });
      if (error instanceof AppError) throw error;
      throw new AppError(details.message, details.status, details.code);
    }
  }

  prepareChat(question: string, history: AssistantHistoryMessage[]): PreparedChat {
    const config = this.currentConfig();
    if (!config.enabled)
      throw new AppError(
        'AI analysis is disabled. Enable it in Settings first.',
        409,
        'AI_DISABLED',
      );
    if (!config.model || !config.adapter.hasCredential())
      throw new AppError(
        'Configure a model and provider API key in Settings first.',
        409,
        'AI_NOT_CONFIGURED',
      );
    if (!config.cloudConsent)
      throw new AppError(
        `Opt in to sending the minimum ledger context to ${config.provider} in Settings first.`,
        403,
        'AI_CONSENT_REQUIRED',
      );

    const test = this.tests.get(config.testKey);
    if (!test || test.state !== 'ready' || Date.now() - Date.parse(test.testedAt) >= 15 * 60_000)
      throw new AppError(
        'Test the selected provider connection before starting a chat.',
        409,
        'AI_CONNECTION_TEST_REQUIRED',
      );

    const prepared = this.context.build(question, history);
    return {
      adapter: config.adapter,
      input: {
        model: config.model,
        system: prepared.system,
        messages: prepared.providerMessages,
      },
      metadata: prepared.metadata,
      ...(prepared.clarification ? { clarification: prepared.clarification } : {}),
    };
  }

  async stream(
    prepared: PreparedChat,
    signal: AbortSignal,
    onDelta: (text: string) => void,
  ): Promise<void> {
    if (prepared.clarification) {
      onDelta(prepared.clarification);
      return;
    }
    const timeout = abortAfter(60_000);
    const abortFromClient = () =>
      timeout.abort(signal.reason ?? new DOMException('Request cancelled', 'AbortError'));
    if (signal.aborted) abortFromClient();
    else signal.addEventListener('abort', abortFromClient, { once: true });
    let count = 0;
    try {
      await prepared.adapter.streamCompletion(prepared.input, timeout.signal, (text) => {
        count += text.length;
        onDelta(text);
      });
      if (count === 0) throw new AIProviderError('AI_INVALID_RESPONSE');
    } catch (error) {
      if (signal.aborted) throw error;
      const details = errorDetails(error);
      throw new AppError(details.message, details.status, details.code);
    } finally {
      signal.removeEventListener('abort', abortFromClient);
      timeout.dispose();
    }
  }
}
