import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Brain,
  History,
  RotateCcw,
  Send,
  Square,
  TrendingDown,
} from 'lucide-react';
import {
  fetchAssistantStatus,
  streamAssistantChat,
  AssistantStreamError,
} from '../services/endpoints';
import { useChat } from '../services/chatContext';
import type { Message } from '../services/chatContext';

const SUGGESTED_PROMPTS = [
  {
    icon: Brain,
    label: 'Analyze subscriptions',
    prompt: 'Analyze my subscriptions and recurring payments.',
  },
  { icon: TrendingDown, label: 'Burn rate', prompt: 'Calculate my current monthly burn rate.' },
  { icon: AlertTriangle, label: 'Anomalies', prompt: 'Find any unusual transactions this month.' },
  { icon: Brain, label: 'Spending', prompt: 'What are my top spending categories?' },
];

interface ActiveRequest {
  id: string;
  question: string;
  token: number;
  controller: AbortController;
  provider: string;
  model: string;
  mode: 'local' | 'cloud';
}

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Assistant() {
  const { messages, addMessage, updateMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRequest = useRef<ActiveRequest | null>(null);
  const generation = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const statusQuery = useQuery({
    queryKey: ['assistant-status'],
    queryFn: fetchAssistantStatus,
    refetchInterval: 30_000,
  });
  const status = statusQuery.data?.data;
  const ready =
    status?.state === 'ready' && status.enabled && (status.mode === 'local' || status.cloudConsent);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const request = activeRequest.current;
    if (!request || !status) return;
    if (
      request.provider !== status.provider ||
      request.model !== status.model ||
      request.mode !== status.mode ||
      !status.enabled ||
      (status.mode === 'cloud' && !status.cloudConsent)
    ) {
      request.controller.abort(
        new DOMException('Provider settings changed during the request.', 'AbortError'),
      );
    }
  }, [status]);

  useEffect(
    () => () => {
      generation.current += 1;
      activeRequest.current?.controller.abort(
        new DOMException('Assistant page closed.', 'AbortError'),
      );
      activeRequest.current = null;
    },
    [],
  );

  async function send(prompt?: string, retryAssistantId?: string) {
    if (activeRequest.current || !ready || !status) return;
    const question = (prompt ?? input).trim();
    if (!question) return;

    const previousMessages = messages;
    const retryIndex = retryAssistantId
      ? previousMessages.findIndex((message) => message.id === retryAssistantId)
      : -1;
    let userMessage: Message | undefined;
    if (retryIndex < 0) {
      userMessage = {
        id: requestId(),
        role: 'user',
        content: question,
        timestamp: timestamp(),
        status: 'complete',
      };
      addMessage(userMessage);
    }

    const assistantMessage: Message = {
      id: requestId(),
      role: 'assistant',
      content: '',
      timestamp: timestamp(),
      status: 'pending',
    };
    addMessage(assistantMessage);
    const token = ++generation.current;
    const controller = new AbortController();
    activeRequest.current = {
      id: assistantMessage.id,
      question,
      token,
      controller,
      provider: status.provider,
      model: status.model,
      mode: status.mode,
    };
    setActiveId(assistantMessage.id);
    let responseText = '';

    const history = (retryIndex >= 0 ? previousMessages.slice(0, retryIndex) : previousMessages)
      .filter((message) => {
        if (message.role === 'user') return true;
        if (message.status === 'complete') return true;
        return (
          !message.status &&
          !/AI backend is unavailable|does not connect to an AI provider/i.test(message.content)
        );
      })
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 800) }));

    try {
      await streamAssistantChat(
        question,
        history,
        controller.signal,
        (metadata) => {
          if (generation.current === token) updateMessage(assistantMessage.id, { metadata });
        },
        (delta) => {
          if (generation.current !== token) return;
          responseText = `${responseText}${delta}`.slice(0, 12_000);
          updateMessage(assistantMessage.id, { content: responseText, status: 'pending' });
        },
      );
      if (generation.current !== token) return;
      updateMessage(assistantMessage.id, {
        content: responseText,
        status: 'complete',
        error: undefined,
      });
      setInput((current) => (current === question ? '' : current));
    } catch (error) {
      if (generation.current !== token) return;
      const aborted = controller.signal.aborted;
      const reason = controller.signal.reason;
      const cancelledByChange =
        reason instanceof Error && reason.message.includes('settings changed');
      const message = aborted
        ? cancelledByChange
          ? 'Provider settings changed. The request stopped; retry with the selected provider.'
          : 'Request cancelled.'
        : error instanceof AssistantStreamError
          ? error.message
          : 'The connection ended unexpectedly. Your question is ready to retry.';
      updateMessage(assistantMessage.id, {
        content: responseText,
        status: responseText ? 'partial' : aborted ? 'cancelled' : 'failed',
        error: message,
      });
      setInput((current) => (current.trim() ? current : question));
    } finally {
      if (activeRequest.current?.token === token) {
        activeRequest.current = null;
        setActiveId(null);
      }
    }
  }

  function stop() {
    activeRequest.current?.controller.abort(
      new DOMException('Request cancelled by the user.', 'AbortError'),
    );
  }

  function clearHistory() {
    generation.current += 1;
    activeRequest.current?.controller.abort(
      new DOMException('Chat history was cleared.', 'AbortError'),
    );
    activeRequest.current = null;
    setActiveId(null);
    setInput('');
    clearMessages();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const statusLabel = statusQuery.isLoading
    ? 'Checking assistant'
    : (status?.state ?? (statusQuery.error ? 'Status unavailable' : 'Not configured'));

  return (
    <div className="flex h-[calc(100vh-1.75rem)] min-h-[32rem] flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant bg-surface-container-lowest px-4 md:px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-primary-fixed-dim bg-primary-fixed-dim/10 text-primary-fixed-dim">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-primary">Ghost AI</h1>
          <p
            className={`mt-0.5 text-xs uppercase tracking-wider ${ready ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}
          >
            {statusLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          aria-label="Clear local chat history"
          className="ml-auto rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-fixed-dim"
          title="Clear chat"
        >
          <History className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6"
        role="log"
        aria-label="Assistant conversation"
      >
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.map((message) => {
            const previousUser =
              message.role === 'assistant'
                ? [...messages.slice(0, messages.indexOf(message))]
                    .reverse()
                    .find((item) => item.role === 'user')
                : undefined;
            return (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex max-w-[95%] gap-3 sm:max-w-[88%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${message.role === 'user' ? 'border-outline-variant bg-surface-bright' : 'border-primary-fixed-dim bg-primary-fixed-dim/10'}`}
                  >
                    {message.role === 'user' ? (
                      <span className="text-xs font-bold text-on-surface">U</span>
                    ) : (
                      <Bot className="h-4 w-4 text-primary-fixed-dim" aria-hidden="true" />
                    )}
                  </div>
                  <div
                    className={`min-w-0 rounded px-4 py-3 text-sm ${message.role === 'user' ? 'rounded-tr-none border border-outline-variant bg-surface-container-high text-on-surface' : 'rounded-tl-none border border-outline-variant bg-surface-container text-on-surface'}`}
                  >
                    {message.content ? (
                      <ChatContent content={message.content} />
                    ) : message.status === 'pending' ? (
                      <span className="text-on-surface-variant">
                        Analyzing your ledger context…
                      </span>
                    ) : null}
                    {message.status === 'pending' && message.id !== 'intro' && (
                      <span className="sr-only" aria-live="polite">
                        Assistant is responding
                      </span>
                    )}
                    {message.status === 'partial' && (
                      <p className="mt-2 text-xs text-amber-300">Partial response</p>
                    )}
                    {message.status === 'failed' && (
                      <p className="mt-2 text-xs text-error">Analysis failed</p>
                    )}
                    {message.status === 'cancelled' && (
                      <p className="mt-2 text-xs text-on-surface-variant">Cancelled</p>
                    )}
                    {message.error && (
                      <p role="status" className="mt-2 text-xs text-on-surface-variant">
                        {message.error}
                      </p>
                    )}
                    {message.metadata && <ContextSummary metadata={message.metadata} />}
                    {message.role === 'assistant' &&
                      ['partial', 'failed', 'cancelled'].includes(message.status ?? '') &&
                      previousUser && (
                        <button
                          type="button"
                          onClick={() => void send(previousUser.content, message.id)}
                          disabled={!ready || activeId !== null}
                          className="mt-3 inline-flex items-center gap-1.5 rounded border border-outline-variant px-2.5 py-1.5 text-xs text-primary-fixed-dim hover:bg-surface-container-high disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                        </button>
                      )}
                  </div>
                </div>
                {message.timestamp && (
                  <span
                    className={`mt-1.5 text-xs text-on-surface-variant ${message.role === 'user' ? 'mr-11' : 'ml-11'}`}
                  >
                    {message.timestamp}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-5 pt-6 md:px-6 md:pb-6 md:pt-8">
        <div className="mx-auto max-w-4xl space-y-3">
          {!ready && (
            <div className="flex flex-wrap items-center gap-2 rounded border border-outline-variant bg-surface-container-low p-3 text-sm text-on-surface-variant">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">
                {status?.message ??
                  (statusQuery.error
                    ? 'Could not read assistant status.'
                    : 'Configure and test an AI provider to start.')}
              </span>
              <Link
                to="/settings"
                className="rounded px-2 py-1 text-primary-fixed-dim underline underline-offset-2"
              >
                Open Settings
              </Link>
            </div>
          )}
          {ready && status?.mode === 'cloud' && (
            <p className="text-center text-xs text-on-surface-variant">
              Your question, recent chat context, and relevant ledger data will be sent to{' '}
              {status.provider} at {status.destination}. Consent can be withdrawn in Settings.
            </p>
          )}
          {ready && status?.mode === 'local' && (
            <p className="text-center text-xs text-on-surface-variant">
              Requests stay on the configured local Ollama server at {status.destination}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((suggestion) => (
              <button
                type="button"
                key={suggestion.label}
                onClick={() => void send(suggestion.prompt)}
                disabled={!ready || activeId !== null}
                className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-surface-container px-3 py-1.5 text-xs uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              >
                <suggestion.icon
                  className="h-3.5 w-3.5 text-primary-fixed-dim"
                  aria-hidden="true"
                />
                {suggestion.label}
              </button>
            ))}
          </div>
          <div className="flex items-end rounded border border-outline-variant bg-surface-container-lowest shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-colors focus-within:border-primary-fixed-dim">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Ask Ghost AI about your ledger"
              className="max-h-40 min-h-14 w-full resize-y border-none bg-transparent p-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-0"
              placeholder={
                ready
                  ? 'Ask about your spending, subscriptions, or transactions…'
                  : 'Configure an assistant provider in Settings'
              }
              rows={2}
              maxLength={1000}
            />
            {activeId ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop assistant response"
                className="mb-2 mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-error text-white transition-colors hover:bg-error/80"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void send()}
                aria-label="Send question to Ghost AI"
                disabled={!ready || !input.trim()}
                className="mb-2 mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-fixed-dim text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p role="note" className="text-center text-xs text-outline">
            Chat history and source evidence stay in this browser. Amounts and summaries come from
            the ledger; anomaly and recurring flags are estimates. Press Enter to send and
            Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContextSummary({ metadata }: { metadata: NonNullable<Message['metadata']> }) {
  return (
    <div className="mt-3 border-t border-outline-variant/60 pt-2 text-xs leading-relaxed text-on-surface-variant">
      <p>Period: {metadata.period}</p>
      <p>Filters: {metadata.filters.join(', ') || 'none'}</p>
      <p>
        Currencies: {metadata.currencies.join(', ') || 'none'} · Data through {metadata.cutoff}
      </p>
      <p>
        Context{' '}
        {metadata.truncated
          ? `was truncated: ${metadata.truncationDetails.join('; ') || 'size limit reached'}`
          : 'was not truncated'}
        .
      </p>
      <details className="mt-2 rounded border border-outline-variant/60 px-2 py-1.5">
        <summary className="cursor-pointer text-primary-fixed-dim">
          Ledger evidence ({metadata.transactionReferences.length} transaction references)
        </summary>
        <div className="mt-2 space-y-2">
          <section aria-label="Application calculated totals">
            <p className="font-medium text-on-surface">Calculated totals by currency</p>
            {metadata.supportingTotals.length ? (
              <ul>
                {metadata.supportingTotals.map((total) => (
                  <li key={total.currency}>
                    {total.currency}: income {total.income.toFixed(2)}, expenses{' '}
                    {total.expenses.toFixed(2)}, net {total.netSavings.toFixed(2)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No matching totals for this period.</p>
            )}
          </section>
          {metadata.categoryTotals.length > 0 && (
            <section aria-label="Expense category totals">
              <p className="font-medium text-on-surface">Expense categories</p>
              <ul>
                {metadata.categoryTotals.map((category, index) => (
                  <li key={`${category.currency}-${category.name}-${index}`}>
                    {category.name}: {category.currency} {category.total.toFixed(2)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-label="Supporting transaction references">
            <p className="font-medium text-on-surface">Transaction references</p>
            {metadata.transactionReferences.length ? (
              <ul className="space-y-1">
                {metadata.transactionReferences.map((reference) => (
                  <li key={reference.id}>
                    <span className="font-mono">
                      #{reference.id} · {reference.date}
                    </span>{' '}
                    {reference.description}
                    {reference.merchant ? ` · ${reference.merchant}` : ''} · {reference.category} ·{' '}
                    {reference.currency} {reference.amount.toFixed(2)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No matching transactions in this period.</p>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}

function ChatContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words">
      {content.split('\n').map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**'))
          return (
            <strong key={index} className="block text-on-surface">
              {line.replace(/\*\*/g, '')}
            </strong>
          );
        if (line.startsWith('*') && line.endsWith('*'))
          return (
            <em key={index} className="block text-on-surface-variant">
              {line.replace(/\*/g, '')}
            </em>
          );
        if (line.trim() === '') return <br key={index} />;
        return (
          <p key={index} className="whitespace-pre-wrap text-sm">
            {line}
          </p>
        );
      })}
    </div>
  );
}
