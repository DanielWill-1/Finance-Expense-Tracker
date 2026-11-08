import {
  AIProviderError,
  type AIProviderName,
  type ProviderAdapter,
  type ProviderCompletionInput,
} from './providerTypes';
import { providerCredential } from './credentialStore';

type FetchLike = typeof fetch;

const CLOUD_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/responses',
  anthropic: 'https://api.anthropic.com/v1/messages',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
} as const;

function endpointFor(provider: Exclude<AIProviderName, 'ollama'>): string {
  const official = CLOUD_ENDPOINTS[provider];
  if (process.env.NODE_ENV !== 'test') return official;
  const raw = process.env[`AI_TEST_${provider.toUpperCase()}_URL`]?.trim();
  if (!raw) return official;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AIProviderError('AI_INVALID_DESTINATION');
  }
  if (
    url.protocol !== 'http:' ||
    !new Set(['localhost', '127.0.0.1', '[::1]']).has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new AIProviderError('AI_INVALID_DESTINATION');
  }
  return url.toString();
}

const MAX_OUTPUT_CHARS = 12_000;
const TEST_PROMPT = 'Reply with exactly READY.';
const GROQ_REASONING_MODELS = new Set(['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);

function isGroqReasoningModel(model: string): boolean {
  return GROQ_REASONING_MODELS.has(model.trim().toLowerCase());
}

function credentialFor(provider: AIProviderName): string | undefined {
  if (provider === 'ollama') return undefined;
  return providerCredential(provider);
}

function getOllamaUrl(rawValue = process.env.OLLAMA_BASE_URL): URL {
  const raw = rawValue?.trim() || 'http://127.0.0.1:11434';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AIProviderError('AI_INVALID_DESTINATION');
  }
  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);
  if (
    url.protocol !== 'http:' ||
    !allowedHosts.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  ) {
    throw new AIProviderError('AI_INVALID_DESTINATION');
  }
  return url;
}

function ollamaEndpoint(path: string, base: URL): string {
  return new URL(path, `${base.origin}/`).toString();
}

function headersFor(provider: AIProviderName, streaming: boolean): Record<string, string> {
  if (provider === 'anthropic') {
    return {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': credentialFor(provider) ?? '',
      accept: streaming ? 'text/event-stream' : 'application/json',
    };
  }
  if (provider === 'openai' || provider === 'groq') {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${credentialFor(provider) ?? ''}`,
      accept: streaming ? 'text/event-stream' : 'application/json',
    };
  }
  return {
    'content-type': 'application/json',
    accept: streaming ? 'application/x-ndjson' : 'application/json',
  };
}

function classifyHttpError(provider: AIProviderName, status: number): AIProviderError {
  if (status === 401 || status === 403)
    return new AIProviderError('AI_AUTHENTICATION_FAILED', undefined, 401);
  if (status === 404) return new AIProviderError('AI_MODEL_NOT_FOUND', undefined, 422);
  if (status === 408 || status === 504) return new AIProviderError('AI_TIMEOUT', undefined, 504);
  if (status === 429) return new AIProviderError('AI_RATE_LIMITED', undefined, 429);
  if (provider === 'ollama' && status === 500) {
    return new AIProviderError('AI_MODEL_NOT_FOUND', undefined, 422);
  }
  if (status >= 500) return new AIProviderError('AI_PROVIDER_UNREACHABLE', undefined, 503);
  return new AIProviderError('AI_PROVIDER_FAILED', undefined, 502);
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    if (value && typeof value === 'object' && !Array.isArray(value))
      return value as Record<string, unknown>;
  } catch {
    // The response body is intentionally not included in errors or logs.
  }
  throw new AIProviderError('AI_INVALID_RESPONSE');
}

function buildMessages(input: ProviderCompletionInput) {
  return [{ role: 'system', content: input.system }, ...input.messages];
}

function extractOpenAIText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = (item as Record<string, unknown>).content;
      return Array.isArray(content) ? content : [];
    })
    .flatMap((item) =>
      item && typeof item === 'object' && typeof (item as Record<string, unknown>).text === 'string'
        ? [(item as Record<string, unknown>).text as string]
        : [],
    )
    .join('');
}

function extractText(provider: AIProviderName, payload: Record<string, unknown>): string {
  if (provider === 'openai') return extractOpenAIText(payload);
  if (provider === 'anthropic') {
    const content = Array.isArray(payload.content) ? payload.content : [];
    return content
      .flatMap((item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).text === 'string'
          ? [(item as Record<string, unknown>).text as string]
          : [],
      )
      .join('');
  }
  if (provider === 'groq') {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const message =
      choices[0] && typeof choices[0] === 'object'
        ? (choices[0] as Record<string, unknown>).message
        : undefined;
    return message &&
      typeof message === 'object' &&
      typeof (message as Record<string, unknown>).content === 'string'
      ? ((message as Record<string, unknown>).content as string)
      : '';
  }
  const message = payload.message;
  return message &&
    typeof message === 'object' &&
    typeof (message as Record<string, unknown>).content === 'string'
    ? ((message as Record<string, unknown>).content as string)
    : '';
}

function testBody(provider: AIProviderName, model: string) {
  if (provider === 'openai')
    return { model, input: [{ role: 'user', content: TEST_PROMPT }], max_output_tokens: 16 };
  if (provider === 'anthropic')
    return { model, max_tokens: 16, messages: [{ role: 'user', content: TEST_PROMPT }] };
  if (provider === 'groq') {
    return {
      model,
      messages: [{ role: 'user', content: TEST_PROMPT }],
      max_completion_tokens: isGroqReasoningModel(model) ? 1024 : 16,
      ...(isGroqReasoningModel(model) ? { reasoning_effort: 'low', include_reasoning: false } : {}),
    };
  }
  return { model, messages: [{ role: 'user', content: TEST_PROMPT }], stream: false };
}

function groqMessages(input: ProviderCompletionInput) {
  if (!isGroqReasoningModel(input.model)) return buildMessages(input);
  const firstUserIndex = input.messages.findIndex((message) => message.role === 'user');
  const messages = [...input.messages];
  if (firstUserIndex < 0) return [{ role: 'user', content: input.system }, ...messages];
  const firstUser = messages[firstUserIndex]!;
  messages[firstUserIndex] = {
    role: 'user',
    content: `${input.system}\n\n${firstUser.content}`,
  };
  return messages;
}

function chatBody(provider: AIProviderName, input: ProviderCompletionInput, streaming: boolean) {
  if (provider === 'openai') {
    return {
      model: input.model,
      instructions: input.system,
      input: input.messages,
      max_output_tokens: 900,
      stream: streaming,
    };
  }
  if (provider === 'anthropic') {
    return {
      model: input.model,
      system: input.system,
      max_tokens: 900,
      messages: input.messages,
      stream: streaming,
    };
  }
  if (provider === 'groq') {
    const reasoningModel = isGroqReasoningModel(input.model);
    return {
      model: input.model,
      messages: groqMessages(input),
      max_completion_tokens: reasoningModel ? 2048 : 900,
      stream: streaming,
      ...(reasoningModel ? { reasoning_effort: 'low', include_reasoning: false } : {}),
    };
  }
  return { model: input.model, messages: buildMessages(input), stream: streaming };
}

async function postJson(
  provider: AIProviderName,
  url: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: headersFor(provider, false),
      body: JSON.stringify(body),
      signal,
      redirect: 'error',
    });
  } catch (error) {
    if (signal.aborted) {
      if (signal.reason instanceof Error && signal.reason.name === 'TimeoutError')
        throw new AIProviderError('AI_TIMEOUT', undefined, 504);
      throw error;
    }
    throw new AIProviderError('AI_PROVIDER_UNREACHABLE', undefined, 503);
  }
  if (!response.ok) throw classifyHttpError(provider, response.status);
  return parseJson(response);
}

async function* sseData(response: Response): AsyncGenerator<{ event: string; data: string }> {
  if (!response.body) throw new AIProviderError('AI_INVALID_RESPONSE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  const parseLine = (line: string): { event: string; data: string } | undefined => {
    if (line === '') {
      if (dataLines.length === 0) {
        eventName = '';
        return undefined;
      }
      const result = { event: eventName, data: dataLines.join('\n') };
      eventName = '';
      dataLines = [];
      return result;
    }
    if (line.startsWith(':')) return undefined;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
    return undefined;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        const parsed = parseLine(line);
        if (parsed) yield parsed;
        newline = buffer.indexOf('\n');
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      const parsed = parseLine(buffer.replace(/\r$/, ''));
      if (parsed) yield parsed;
    }
    const final = parseLine('');
    if (final) yield final;
  } finally {
    reader.releaseLock();
  }
}

async function streamRequest(
  provider: AIProviderName,
  url: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal: AbortSignal,
  onDelta: (text: string) => void,
): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: headersFor(provider, true),
      body: JSON.stringify(body),
      signal,
      redirect: 'error',
    });
  } catch (error) {
    if (signal.aborted) {
      if (signal.reason instanceof Error && signal.reason.name === 'TimeoutError')
        throw new AIProviderError('AI_TIMEOUT', undefined, 504);
      throw error;
    }
    throw new AIProviderError('AI_PROVIDER_UNREACHABLE', undefined, 503);
  }
  if (!response.ok) throw classifyHttpError(provider, response.status);

  let total = 0;
  const emit = (text: string) => {
    total += text.length;
    if (total > MAX_OUTPUT_CHARS) throw new AIProviderError('AI_OUTPUT_LIMIT', undefined, 502);
    if (text) onDelta(text);
  };

  if (provider === 'ollama') {
    if (!response.body) throw new AIProviderError('AI_INVALID_RESPONSE');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf('\n');
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(line) as Record<string, unknown>;
            } catch {
              throw new AIProviderError('AI_INVALID_RESPONSE');
            }
            const text = extractText(provider, payload);
            emit(text);
            if (payload.error) throw new AIProviderError('AI_PROVIDER_FAILED');
          }
          newline = buffer.indexOf('\n');
        }
      }
      const tail = buffer.trim();
      if (tail) {
        try {
          emit(extractText(provider, JSON.parse(tail) as Record<string, unknown>));
        } catch (error) {
          if (error instanceof AIProviderError) throw error;
          throw new AIProviderError('AI_INVALID_RESPONSE');
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  for await (const item of sseData(response)) {
    if (item.data === '[DONE]') break;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(item.data) as Record<string, unknown>;
    } catch {
      throw new AIProviderError('AI_INVALID_RESPONSE');
    }
    if (payload.error) throw new AIProviderError('AI_PROVIDER_FAILED');
    if (provider === 'openai') {
      if (item.event === 'response.output_text.delta' && typeof payload.delta === 'string')
        emit(payload.delta);
      if (item.event === 'response.failed') throw new AIProviderError('AI_PROVIDER_FAILED');
    } else if (provider === 'anthropic') {
      const delta = payload.delta;
      if (
        item.event === 'content_block_delta' &&
        delta &&
        typeof delta === 'object' &&
        typeof (delta as Record<string, unknown>).text === 'string'
      )
        emit((delta as Record<string, unknown>).text as string);
      if (item.event === 'error') throw new AIProviderError('AI_PROVIDER_FAILED');
    } else {
      const choices = Array.isArray(payload.choices) ? payload.choices : [];
      const delta =
        choices[0] && typeof choices[0] === 'object'
          ? (choices[0] as Record<string, unknown>).delta
          : undefined;
      if (
        delta &&
        typeof delta === 'object' &&
        typeof (delta as Record<string, unknown>).content === 'string'
      )
        emit((delta as Record<string, unknown>).content as string);
    }
  }
}

export function createProviderAdapter(
  name: AIProviderName,
  options: { fetchImpl?: FetchLike; ollamaBaseUrl?: string } = {},
): ProviderAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const ollamaBase = name === 'ollama' ? getOllamaUrl(options.ollamaBaseUrl) : undefined;
  const endpoint = name === 'ollama' ? undefined : endpointFor(name);
  const destination = name === 'ollama' ? ollamaBase!.origin : new URL(endpoint!).origin;
  const urlFor = (path: string) =>
    name === 'ollama' ? ollamaEndpoint(path, ollamaBase!) : endpoint!;

  return {
    name,
    destination,
    isCloud: name !== 'ollama',
    hasCredential: () => name === 'ollama' || Boolean(credentialFor(name)),
    async verifyModel(model, signal) {
      if (name !== 'ollama') return;
      const response = await fetchImpl(urlFor('/api/tags'), { signal, redirect: 'error' });
      if (!response.ok) throw classifyHttpError(name, response.status);
      const payload = await parseJson(response);
      const models = Array.isArray(payload.models) ? payload.models : [];
      const available = models.some(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          [
            (entry as Record<string, unknown>).name,
            (entry as Record<string, unknown>).model,
          ].includes(model),
      );
      if (!available) throw new AIProviderError('AI_MODEL_NOT_FOUND', undefined, 422);
    },
    async testConnection(model, signal) {
      await this.verifyModel(model, signal);
      const payload = await postJson(
        name,
        urlFor(name === 'ollama' ? '/api/chat' : ''),
        testBody(name, model),
        fetchImpl,
        signal,
      );
      const text = extractText(name, payload).trim();
      if (!text || !/\bREADY\b/i.test(text)) throw new AIProviderError('AI_INVALID_RESPONSE');
    },
    async streamCompletion(input, signal, onDelta) {
      await this.verifyModel(input.model, signal);
      await streamRequest(
        name,
        urlFor(name === 'ollama' ? '/api/chat' : ''),
        chatBody(name, input, true),
        fetchImpl,
        signal,
        onDelta,
      );
    },
  };
}

function invalidAdapter(name: AIProviderName, cause: unknown): ProviderAdapter {
  const error =
    cause instanceof AIProviderError ? cause : new AIProviderError('AI_PROVIDER_UNREACHABLE');
  return {
    name,
    destination:
      name === 'ollama' ? 'Invalid local Ollama endpoint' : new URL(CLOUD_ENDPOINTS[name]).origin,
    isCloud: name !== 'ollama',
    hasCredential: () => name === 'ollama' || Boolean(credentialFor(name)),
    async verifyModel() {
      throw error;
    },
    async testConnection() {
      throw error;
    },
    async streamCompletion() {
      throw error;
    },
  };
}

export function createProviderAdapters(options: { fetchImpl?: FetchLike } = {}) {
  const adapters = new Map<AIProviderName, ProviderAdapter>();
  const get = (name: AIProviderName) => {
    const saved = adapters.get(name);
    if (saved) return saved;
    try {
      const adapter = createProviderAdapter(name, options);
      adapters.set(name, adapter);
      return adapter;
    } catch (error) {
      const adapter = invalidAdapter(name, error);
      adapters.set(name, adapter);
      return adapter;
    }
  };
  return {
    get openai() {
      return get('openai');
    },
    get anthropic() {
      return get('anthropic');
    },
    get groq() {
      return get('groq');
    },
    get ollama() {
      return get('ollama');
    },
  };
}
