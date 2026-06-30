import { useState, useRef, useEffect } from 'react';
import { useChat } from '../services/chatContext';
import { Bot, Send, Brain, TrendingDown, AlertTriangle, History } from 'lucide-react';
import type { Message as MessageType } from '../services/chatContext';

const SUGGESTED_PROMPTS = [
  { icon: Brain, label: 'Analyze subscriptions', prompt: 'Analyze my subscriptions and recurring payments.' },
  { icon: TrendingDown, label: 'Burn rate', prompt: 'Calculate my current monthly burn rate.' },
  { icon: AlertTriangle, label: 'Anomalies', prompt: 'Find any unusual transactions this month.' },
  { icon: Brain, label: 'Spending', prompt: 'What are my top spending categories?' },
];

export default function Assistant() {
  const { messages, addMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function handleSend(prompt?: string) {
    const text = prompt || input;
    if (!text.trim()) return;

    const userMsg: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addMessage(userMsg);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: MessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've received your query about: *"${text}"*

AI analysis will be available once an AI provider is configured in **Settings**. You can choose from OpenAI, Anthropic, Groq, or a local Ollama instance.

Until then, I can suggest visiting the **Dashboard** for instant analytics or the **Ledger** to review your transactions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessage(aiMsg);
      setIsTyping(false);
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1.75rem)]">
      <header className="h-16 border-b border-outline-variant flex items-center px-6 bg-surface-container-lowest shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary-fixed-dim/10 border border-primary-fixed-dim flex items-center justify-center text-primary-fixed-dim">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-primary">Ghost AI</h1>
            <p className="text-xs text-primary-fixed-dim/80 uppercase tracking-wider mt-0.5">System Ready</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={clearMessages} className="text-on-surface-variant hover:text-primary transition-colors" title="Clear chat">
            <History className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center border ${
                  msg.role === 'user'
                    ? 'bg-surface-bright border-outline-variant'
                    : 'bg-primary-fixed-dim/10 border-primary-fixed-dim'
                }`}
              >
                {msg.role === 'user' ? (
                  <span className="text-xs font-bold text-on-surface">U</span>
                ) : (
                  <Bot className="h-4 w-4 text-primary-fixed-dim" />
                )}
              </div>
              <div
                className={`px-4 py-3 rounded text-sm ${
                  msg.role === 'user'
                    ? 'bg-surface-container-high border border-outline-variant rounded-tr-none text-on-surface'
                    : 'bg-surface-container border border-outline-variant rounded-tl-none text-on-surface'
                }`}
              >
                <ChatContent content={msg.content} />
              </div>
            </div>
            {msg.timestamp && (
              <span className={`text-xs text-on-surface-variant mt-1.5 ${msg.role === 'user' ? 'mr-11' : 'ml-11'}`}>
                {msg.timestamp}
              </span>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-primary-fixed-dim/10 border border-primary-fixed-dim flex-shrink-0 flex items-center justify-center animate-pulse">
              <Bot className="h-4 w-4 text-primary-fixed-dim" />
            </div>
            <div className="bg-surface-container border border-outline-variant rounded rounded-tl-none px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6 px-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((sp) => (
              <button
                key={sp.label}
                onClick={() => handleSend(sp.prompt)}
                className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
              >
                <sp.icon className="h-3.5 w-3.5 text-primary-fixed-dim" />
                {sp.label}
              </button>
            ))}
          </div>
          <div className="relative flex items-end bg-surface-container-lowest border border-outline-variant rounded focus-within:border-primary-fixed-dim transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none focus:ring-0 text-on-surface text-sm placeholder-on-surface-variant p-4 resize-none max-h-32"
              placeholder="Query ledger data..."
              rows={1}
            />
            <div className="flex items-center gap-2 pr-3 pb-3 shrink-0">
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-10 h-10 bg-primary-fixed-dim hover:bg-primary-container text-on-primary flex items-center justify-center rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-outline tracking-wider">
            AI responses may contain inaccuracies. Verify critical data.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <strong key={i} className="block text-on-surface">{line.replace(/\*\*/g, '')}</strong>;
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <em key={i} className="block text-on-surface-variant">{line.replace(/\*/g, '')}</em>;
        }
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} className="text-sm">{line}</p>;
      })}
    </div>
  );
}
