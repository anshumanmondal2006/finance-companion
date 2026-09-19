import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Trash2, Bot, User, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { sendChatMessage } from '@/lib/api';
import type { ChatUserContext } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Page label helper ────────────────────────────────────────────────────────
function getPageContext(pathname: string): string {
  if (pathname === '/') return 'landing';
  if (pathname.startsWith('/auth')) return 'auth';
  if (pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.includes('/budget')) return 'budget';
  if (pathname.includes('/investments')) return 'investments';
  if (pathname.includes('/simulation')) return 'simulation';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/education')) return 'education';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'app';
}

// ─── Markdown-lite renderer (bold / bullets) ─────────────────────────────────
function RenderMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Bold: **text**
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = boldParts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
        if (isBullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-primary">•</span>
              <span>{rendered}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

// ─── Suggested quick questions ────────────────────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    'What does my health score mean?',
    'How can I improve my financial score?',
    'Explain my investment allocation',
  ],
  budget: [
    'Where am I overspending?',
    'How do I reduce my expenses?',
    'What is the 50/30/20 rule?',
  ],
  investments: [
    'Why are index funds recommended?',
    'What is asset diversification?',
    'How does compounding work?',
  ],
  simulation: [
    'How reliable is the Monte Carlo simulation?',
    'What if I increase my monthly savings?',
    'How do I reach my goal faster?',
  ],
  education: [
    'Explain mutual funds and SIP',
    'What is asset allocation?',
    'How does compound interest work?',
  ],
  default: [
    'How do I start investing?',
    'What is an emergency fund?',
    'Explain SIP vs lump sum',
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChatBot = () => {
  const location = useLocation();
  const pageContext = getPageContext(location.pathname);

  const {
    chatMessages,
    isChatOpen,
    isChatLoading,
    addChatMessage,
    setChatOpen,
    setChatLoading,
    clearChat,
    onboardingData,
    analysisData,
    ageGroup,
  } = useStore();

  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build user context from store state
  const buildUserContext = (): ChatUserContext | undefined => {
    if (!onboardingData) return undefined;
    return {
      name: onboardingData.profile.name,
      age_group: ageGroup ?? undefined,
      monthly_income: onboardingData.financial.monthlyIncome,
      fixed_expenses: onboardingData.financial.fixedExpenses,
      variable_expenses: onboardingData.financial.variableExpenses,
      risk_answers: onboardingData.risk_answers,
      risk_profile: analysisData?.riskProfile ?? undefined,
      health_score: analysisData?.healthScore ?? undefined,
      goal_type: onboardingData.goal.goalType,
      target_amount: onboardingData.goal.targetAmount,
      timeline_months: onboardingData.goal.timelineMonths,
      budget_allocation: analysisData?.budgetAllocation?.map((b) => ({
        name: b.name,
        percentage: b.percentage,
        recommended: b.recommended,
      })),
      investment_allocation: analysisData?.investmentAllocation?.map((a) => ({
        name: a.name,
        allocation: a.allocation,
        reasoning: a.reasoning,
      })),
    };
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Focus input on open
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isChatOpen]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isChatLoading) return;

    setInput('');

    const userMsg = { role: 'user' as const, content };
    addChatMessage(userMsg);
    setChatLoading(true);

    try {
      const allMessages = [...chatMessages, userMsg];
      const userContext = buildUserContext();
      const reply = await sendChatMessage(allMessages, userContext, pageContext);
      addChatMessage({ role: 'assistant', content: reply });
    } catch {
      addChatMessage({
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check that the model server is running and try again.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = SUGGESTIONS[pageContext] ?? SUGGESTIONS.default;

  return (
    <>
      {/* ── Floating Bubble ── */}
      <button
        onClick={() => setChatOpen(!isChatOpen)}
        aria-label="Open AI Financial Advisor"
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isChatOpen
            ? 'bg-muted text-muted-foreground rotate-0'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {isChatOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {/* Pulse ring when closed */}
        {!isChatOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-20" />
        )}
      </button>

      {/* ── Chat Window ── */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl transition-all duration-300 origin-bottom-right',
          'w-[360px] sm:w-[400px]',
          isChatOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-90 opacity-0 pointer-events-none',
        )}
        style={{ height: '560px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">FinanceBot</p>
              <p className="text-xs text-primary-foreground/70">AI Financial Advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chatMessages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Context badge */}
        <div className="border-b bg-muted/40 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">
            📍 You're on the{' '}
            <span className="font-medium text-foreground capitalize">{pageContext}</span> page
            {onboardingData ? (
              <span className="ml-1">
                · Hi,{' '}
                <span className="font-medium text-foreground">
                  {onboardingData.profile.name.split(' ')[0]}
                </span>!
              </span>
            ) : null}
          </span>
        </div>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto p-4 space-y-3"
        >
          {chatMessages.length === 0 ? (
            /* Welcome state */
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Hey{onboardingData ? `, ${onboardingData.profile.name.split(' ')[0]}` : ''}! 👋
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  I'm your AI financial advisor. Ask me anything about your finances, investments, or goals.
                </p>
              </div>
              {/* Suggestions */}
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Try asking
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-left text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2.5',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm bg-muted text-foreground',
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <RenderMessage text={msg.content} />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isChatLoading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {/* Input */}
        <div className="border-t bg-background rounded-b-2xl p-3">
          <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              disabled={isChatLoading}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-24"
              style={{ minHeight: '24px' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!input.trim() || isChatLoading}
              onClick={() => handleSend()}
            >
              {isChatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            FinanceBot · Powered by Groq · Not financial advice
          </p>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
