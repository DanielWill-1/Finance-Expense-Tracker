import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatContextType {
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

const DEFAULT_MESSAGES: Message[] = [
  {
    id: 'intro',
    role: 'assistant',
    content: `This is GhostLedger's local chat history. The AI backend is unavailable in this release, so no financial analysis is performed here. Use the Dashboard and Ledger to review your actual data.`,
    timestamp: '',
  },
];

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
          return parsed as Message[];
      }
    } catch {
      // Keep the default conversation when stored history is malformed or unavailable.
    }
    return DEFAULT_MESSAGES;
  });

  function addMessage(msg: Message) {
    setMessages((prev) => {
      const next = [...prev, msg];
      try {
        localStorage.setItem('ghostledger_chat', JSON.stringify(next));
      } catch {
        // The in-memory conversation still works when browser storage is unavailable.
      }
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

  return (
    <ChatContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
