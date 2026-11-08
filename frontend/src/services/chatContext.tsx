import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AssistantContextMetadata } from '../types/api';

export type MessageStatus = 'pending' | 'partial' | 'failed' | 'cancelled' | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: MessageStatus;
  metadata?: AssistantContextMetadata;
  error?: string;
}

interface ChatContextType {
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'intro',
    role: 'assistant',
    content:
      'Ask about spending, categories, recurring payments, burn rate, or unusual transactions. AI analysis is optional and can be disabled in Settings.',
    timestamp: '',
    status: 'complete',
  },
];

function validMetadata(value: unknown): value is AssistantContextMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Record<string, unknown>;
  const boundedStrings = (items: unknown, maxItems: number, maxLength: number) =>
    Array.isArray(items) &&
    items.length <= maxItems &&
    items.every((item) => typeof item === 'string' && item.length <= maxLength);
  const finiteNumber = (item: unknown) => typeof item === 'number' && Number.isFinite(item);
  const validCurrency = (item: unknown) => typeof item === 'string' && /^[A-Z]{3}$/.test(item);
  return (
    typeof metadata.period === 'string' &&
    metadata.period.length <= 160 &&
    boundedStrings(metadata.filters, 10, 200) &&
    Array.isArray(metadata.currencies) &&
    metadata.currencies.length <= 10 &&
    metadata.currencies.every(validCurrency) &&
    typeof metadata.cutoff === 'string' &&
    typeof metadata.truncated === 'boolean' &&
    typeof metadata.omittedReferenceRows === 'number' &&
    Number.isFinite(metadata.omittedReferenceRows) &&
    metadata.omittedReferenceRows >= 0 &&
    boundedStrings(metadata.truncationDetails, 10, 240) &&
    Array.isArray(metadata.supportingTotals) &&
    metadata.supportingTotals.length <= 10 &&
    metadata.supportingTotals.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        validCurrency((item as Record<string, unknown>).currency) &&
        finiteNumber((item as Record<string, unknown>).income) &&
        finiteNumber((item as Record<string, unknown>).expenses) &&
        finiteNumber((item as Record<string, unknown>).netSavings),
    ) &&
    Array.isArray(metadata.categoryTotals) &&
    metadata.categoryTotals.length <= 8 &&
    metadata.categoryTotals.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        ((item as Record<string, unknown>).name as string).length <= 100 &&
        validCurrency((item as Record<string, unknown>).currency) &&
        finiteNumber((item as Record<string, unknown>).total),
    ) &&
    Array.isArray(metadata.transactionReferences) &&
    metadata.transactionReferences.length <= 10 &&
    metadata.transactionReferences.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const reference = item as Record<string, unknown>;
      return (
        finiteNumber(reference.id) &&
        typeof reference.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(reference.date) &&
        typeof reference.description === 'string' &&
        reference.description.length <= 160 &&
        (reference.merchant === null ||
          (typeof reference.merchant === 'string' && reference.merchant.length <= 100)) &&
        typeof reference.category === 'string' &&
        reference.category.length <= 100 &&
        finiteNumber(reference.amount) &&
        validCurrency(reference.currency)
      );
    })
  );
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ghostledger_chat');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (message) =>
              message &&
              typeof message.id === 'string' &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string' &&
              typeof message.timestamp === 'string',
          )
        )
          return parsed.slice(-100).map((message) => {
            const isKnownStatus =
              message.status === 'partial' ||
              message.status === 'failed' ||
              message.status === 'cancelled' ||
              message.status === 'complete';
            return {
              id: message.id,
              role: message.role,
              content: message.content.slice(0, 12_000),
              timestamp: message.timestamp,
              status:
                message.status === 'pending'
                  ? 'failed'
                  : isKnownStatus
                    ? message.status
                    : undefined,
              metadata: validMetadata(message.metadata) ? message.metadata : undefined,
              error: typeof message.error === 'string' ? message.error.slice(0, 500) : undefined,
            } as Message;
          });
      }
    } catch {
      // Keep the default conversation when stored history is malformed or unavailable.
    }
    return DEFAULT_MESSAGES;
  });

  function addMessage(msg: Message) {
    setMessages((prev) => {
      const next = [...prev, { ...msg, content: msg.content.slice(0, 12_000) }].slice(-100);
      persist(next);
      return next;
    });
  }

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages((prev) => {
      const next = prev.map((message) =>
        message.id === id
          ? {
              ...message,
              ...patch,
              content: (patch.content ?? message.content).slice(0, 12_000),
            }
          : message,
      );
      persist(next);
      return next;
    });
  }

  function clearMessages() {
    setMessages(DEFAULT_MESSAGES);
    try {
      localStorage.removeItem('ghostledger_chat');
    } catch {
      // Clearing the in-memory conversation remains available when browser storage is unavailable.
    }
  }

  function persist(next: Message[]) {
    try {
      localStorage.setItem('ghostledger_chat', JSON.stringify(next.slice(-100)));
    } catch {
      // The in-memory conversation still works when browser storage is unavailable.
    }
  }

  return (
    <ChatContext.Provider value={{ messages, addMessage, updateMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
