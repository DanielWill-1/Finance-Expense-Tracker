import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createProviderAdapter,
  createProviderAdapters,
} from '../services/assistant/providerAdapters';
import { AIProviderError, type AIProviderName } from '../services/assistant/providerTypes';

const cloudKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GROQ_API_KEY'] as const;
const originalKeys = Object.fromEntries(cloudKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of cloudKeys) {
    const original = originalKeys[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  vi.restoreAllMocks();
});

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function adapterFor(
  provider: AIProviderName,
  fetchImpl: typeof fetch,
  ollamaBaseUrl = 'http://127.0.0.1:11434',
) {
  if (provider === 'ollama') return createProviderAdapter(provider, { fetchImpl, ollamaBaseUrl });
  return createProviderAdapter(provider, { fetchImpl });
}

describe('AI provider contracts', () => {
  it.each([
    ['openai', 'https://api.openai.com/v1/responses', { output_text: 'READY' }],
    [
      'anthropic',
      'https://api.anthropic.com/v1/messages',
      { content: [{ type: 'text', text: 'READY' }] },
    ],
    [
      'groq',
      'https://api.groq.com/openai/v1/chat/completions',
      { choices: [{ message: { content: 'READY' } }] },
    ],
  ] as const)(
    '%s sends a harmless provider-specific connection request',
    async (provider, endpoint, result) => {
      const key =
        provider === 'openai'
          ? 'OPENAI_API_KEY'
          : provider === 'anthropic'
            ? 'ANTHROPIC_API_KEY'
            : 'GROQ_API_KEY';
      process.env[key] = 'synthetic-test-key';
      const requests: { url: string; init?: RequestInit | undefined }[] = [];
      const fetchImpl: typeof fetch = async (input, init) => {
        requests.push({ url: String(input), init });
        return jsonResponse(result);
      };
      const adapter = adapterFor(provider, fetchImpl);
      await adapter.testConnection('contract-model', new AbortController().signal);
      expect(adapter.hasCredential()).toBe(true);
      expect(requests[0]?.url).toBe(endpoint);
      expect(requests[0]?.init?.redirect).toBe('error');
      expect(String(requests[0]?.init?.body)).toContain('Reply with exactly READY.');
      expect(String(requests[0]?.init?.body)).not.toContain('ledger');
    },
  );

  it('gives Groq GPT-OSS enough room for a harmless test and keeps chat reasoning bounded', async () => {
    process.env.GROQ_API_KEY = 'synthetic-groq-key';
    const requests: {
      url: string;
      body: Record<string, unknown>;
      init?: RequestInit | undefined;
    }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      requests.push({ url: String(input), body, init });
      if (body.stream === true) {
        return new Response(
          'data: {"choices":[{"delta":{"content":"Grounded answer"}}]}\n\ndata: [DONE]\n\n',
          { headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return jsonResponse({ choices: [{ message: { content: 'READY' } }] });
    };
    const adapter = adapterFor('groq', fetchImpl);
    await adapter.testConnection('openai/gpt-oss-20b', new AbortController().signal);
    expect(requests[0]?.body).toMatchObject({
      model: 'openai/gpt-oss-20b',
      max_completion_tokens: 1024,
      reasoning_effort: 'low',
      include_reasoning: false,
    });

    const deltas: string[] = [];
    await adapter.streamCompletion(
      {
        model: 'openai/gpt-oss-20b',
        system: 'Use only the supplied ledger context.',
        messages: [
          { role: 'user', content: 'Earlier question' },
          { role: 'assistant', content: 'Earlier answer' },
          { role: 'user', content: 'Current question' },
        ],
      },
      new AbortController().signal,
      (delta) => deltas.push(delta),
    );
    const chatRequest = requests[1];
    expect(chatRequest?.body).toMatchObject({
      model: 'openai/gpt-oss-20b',
      max_completion_tokens: 2048,
      reasoning_effort: 'low',
      include_reasoning: false,
    });
    const messages = chatRequest?.body.messages as { role: string; content: string }[];
    expect(messages.some((message) => message.role === 'system')).toBe(false);
    expect(messages[0]).toMatchObject({
      role: 'user',
      content: expect.stringContaining('Use only the supplied ledger context.'),
    });
    expect(deltas.join('')).toBe('Grounded answer');
  });

  it('checks local Ollama reachability and selected model separately', async () => {
    const requests: { url: string; init?: RequestInit | undefined }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      return String(input).endsWith('/api/tags')
        ? jsonResponse({ models: [{ name: 'local:latest', model: 'local:latest' }] })
        : jsonResponse({ message: { content: 'READY' } });
    };
    const adapter = adapterFor('ollama', fetchImpl);
    expect(adapter.destination).toBe('http://127.0.0.1:11434');
    expect(adapter.hasCredential()).toBe(true);
    await adapter.testConnection('local:latest', new AbortController().signal);
    expect(requests.map((item) => item.url)).toEqual([
      'http://127.0.0.1:11434/api/tags',
      'http://127.0.0.1:11434/api/chat',
    ]);
  });

  it.each([
    [
      'openai',
      'event: response.output_text.delta\ndata: {"delta":"Hello"}\n\nevent: response.completed\ndata: {}\n\n',
    ],
    [
      'anthropic',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\nevent: message_stop\ndata: {}\n\n',
    ],
    ['groq', 'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n'],
    ['ollama', '{"message":{"content":"Hello"},"done":false}\n{"done":true}\n'],
  ] as const)('%s decodes streamed text deltas', async (provider, stream) => {
    if (provider !== 'ollama') {
      const key =
        provider === 'openai'
          ? 'OPENAI_API_KEY'
          : provider === 'anthropic'
            ? 'ANTHROPIC_API_KEY'
            : 'GROQ_API_KEY';
      process.env[key] = 'synthetic-test-key';
    }
    const fetchImpl: typeof fetch = async (input) =>
      provider === 'ollama' && String(input).endsWith('/api/tags')
        ? jsonResponse({ models: [{ name: 'local:latest' }] })
        : new Response(stream, {
            headers: {
              'content-type': provider === 'ollama' ? 'application/x-ndjson' : 'text/event-stream',
            },
          });
    const adapter = adapterFor(provider, fetchImpl);
    const deltas: string[] = [];
    await adapter.streamCompletion(
      {
        model: provider === 'ollama' ? 'local:latest' : 'contract-model',
        system: 'Grounded test',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      new AbortController().signal,
      (delta) => deltas.push(delta),
    );
    expect(deltas.join('')).toBe('Hello');
  });

  it('maps authentication, model, and rate-limit failures without exposing provider bodies', async () => {
    process.env.OPENAI_API_KEY = 'synthetic-secret-value';
    for (const [status, code] of [
      [401, 'AI_AUTHENTICATION_FAILED'],
      [404, 'AI_MODEL_NOT_FOUND'],
      [429, 'AI_RATE_LIMITED'],
    ] as const) {
      const adapter = adapterFor(
        'openai',
        async () => new Response('credential=sensitive-provider-error', { status }),
      );
      await expect(
        adapter.testConnection('contract-model', new AbortController().signal),
      ).rejects.toMatchObject({ code });
    }
  });

  it('rejects malformed provider responses and unsupported Ollama destinations', async () => {
    process.env.OPENAI_API_KEY = 'synthetic-secret-value';
    const malformed = adapterFor('openai', async () => new Response('not json', { status: 200 }));
    await expect(
      malformed.testConnection('contract-model', new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
    });
    expect(() =>
      createProviderAdapter('ollama', { ollamaBaseUrl: 'http://169.254.169.254/latest' }),
    ).toThrow(AIProviderError);
    expect(() =>
      createProviderAdapter('ollama', { ollamaBaseUrl: 'https://localhost:11434' }),
    ).toThrow(AIProviderError);
  });

  it('keeps an invalid Ollama environment URL from breaking other provider setup', async () => {
    const original = process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_BASE_URL = 'https://remote.example.invalid';
    process.env.OPENAI_API_KEY = 'synthetic-test-key';
    try {
      const adapters = createProviderAdapters();
      expect(adapters.openai.destination).toBe('https://api.openai.com');
      await expect(
        adapters.ollama.verifyModel('local:latest', new AbortController().signal),
      ).rejects.toMatchObject({ code: 'AI_INVALID_DESTINATION' });
    } finally {
      if (original === undefined) delete process.env.OLLAMA_BASE_URL;
      else process.env.OLLAMA_BASE_URL = original;
    }
  });

  it('reports missing Ollama models and propagates cancellation to fetch', async () => {
    const local = adapterFor('ollama', async () => jsonResponse({ models: [] }));
    await expect(
      local.testConnection('missing:latest', new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'AI_MODEL_NOT_FOUND',
    });

    const controller = new AbortController();
    const waitingFetch: typeof fetch = async (_input, init) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) reject(init.signal.reason);
        else
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true,
          });
      });
    const cloud = adapterFor('openai', waitingFetch);
    process.env.OPENAI_API_KEY = 'synthetic-test-key';
    const completion = cloud.streamCompletion(
      { model: 'contract-model', system: 'Test', messages: [{ role: 'user', content: 'Hello' }] },
      controller.signal,
      () => undefined,
    );
    controller.abort(new DOMException('test cancel', 'AbortError'));
    await expect(completion).rejects.toMatchObject({ name: 'AbortError' });
  });
});
