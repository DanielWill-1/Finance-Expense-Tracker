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
    content: `Hi! I'm **Ghost AI**, your personal finance assistant.

I can help you analyze spending, identify trends, and understand your financial data. All analysis runs locally on your machine — your data never leaves this device.

**How can I assist you today?**`,
    timestamp: '',
  },
];

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ghostledger_chat');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MESSAGES;
  });

  function addMessage(msg: Message) {
    setMessages((prev) => {
      const next = [...prev, msg];
      try {
        localStorage.setItem('ghostledger_chat', JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearMessages() {
    setMessages(DEFAULT_MESSAGES);
    try {
      localStorage.removeItem('ghostledger_chat');
    } catch {}
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
