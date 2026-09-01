import React, { useState, useEffect, useRef } from 'react';
import {
  TransactionRecord,
  AppSettings,
  WalletState,
  SubscriptionState,
  AssetBalance,
} from '../../types/merchant';
import {
  BusinessMetrics,
  computeBusinessMetrics,
  queryAIBusinessAssistant,
  ChatMessage,
} from '../../services/aiAssistantService';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  TrendingUp,
  Coins,
  Receipt,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  BarChart3,
  Loader2,
  Square,
  Home,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface AIBusinessAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToHome?: () => void;
  transactions: TransactionRecord[];
  settings: AppSettings;
  walletState: WalletState;
  subscriptionState?: SubscriptionState;
  balances?: Record<string, AssetBalance>;
  cryptoRatesUsd?: Record<string, number>;
  cryptoInFiatRates?: Record<string, number>;
  initialPrompt?: string | null;
}

const CATEGORIZED_PROMPTS = [
  {
    category: 'Sales & Revenue',
    items: [
      { label: "Today's sales", icon: Calendar, prompt: "How much did I sell today?" },
      { label: "This month's revenue", icon: TrendingUp, prompt: "How much revenue did I make this month?" },
      { label: "Best sales day", icon: Zap, prompt: "What was my best performing sales day?" },
      { label: "Sales comparison", icon: BarChart3, prompt: "Compare my sales this month with last month. Are my sales increasing or decreasing?" },
    ],
  },
  {
    category: 'Tokens & Ledger',
    items: [
      { label: "Token breakdown", icon: Coins, prompt: "Which payment token is used the most? How much VERSE, USDT, and BTC did I receive?" },
      { label: "Recent transactions", icon: Receipt, prompt: "Show me my recent transactions." },
      { label: "Payment discrepancies", icon: AlertCircle, prompt: "How many payments were underpaid, overpaid, or failed?" },
      { label: "Full performance audit", icon: Sparkles, prompt: "Give me a complete summary of my business performance based on my real sales data." },
    ],
  },
];

export const AIBusinessAssistantModal: React.FC<AIBusinessAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateToHome,
  transactions,
  settings,
  walletState,
  subscriptionState,
  balances = {},
  cryptoRatesUsd = {},
  cryptoInFiatRates = {},
  initialPrompt,
}) => {
  const [metrics, setMetrics] = useState<BusinessMetrics>(() =>
    computeBusinessMetrics(transactions, settings.fiatCurrency)
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 👋 Merchant X AI Business Assistant\n\nI am connected directly to your **verified transaction ledger** (${transactions.length} total records).\n\nAsk me anything about your **real sales volume, received crypto (VERSE, USDT, BTC, ETH, POL), payment trends, and reconciliation**.\n\n*Tap any quick question below or type your inquiry.*`,
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Recalculate metrics when transactions or settings change
  useEffect(() => {
    setMetrics(computeBusinessMetrics(transactions, settings.fiatCurrency));
  }, [transactions, settings.fiatCurrency]);

  // Handle initial prompt when modal opens
  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut: ESC to cancel current generation or close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isLoading) {
          handleCancelQuery();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  const handleCancelQuery = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: 'cancelled-' + Date.now(),
        role: 'assistant',
        content: `*Generation cancelled.*`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleClose = () => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    onClose();
  };

  const handleGoToHome = () => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    if (onNavigateToHome) {
      onNavigateToHome();
    } else {
      onClose();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputPrompt).trim();
    if (!queryText || isLoading) return;

    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsgId = 'user-' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputPrompt('');
    setIsLoading(true);

    // Prepare complete, 100% real context
    const contextPayload = {
      merchantName: settings.merchantName || 'Merchant Terminal',
      merchantLocation: settings.merchantLocation || 'Global',
      fiatCurrency: settings.fiatCurrency || 'USD',
      fiatSymbol: getFiatSymbol(settings.fiatCurrency),
      transactions,
      metrics,
      walletState,
      subscriptionState,
      balances,
      liveRates: cryptoInFiatRates,
      liveRatesUsd: cryptoRatesUsd,
      clientTime: new Date().toISOString(),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      const res = await queryAIBusinessAssistant(queryText, contextPayload, abortController.signal);
      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: res.answer,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${err.message || 'Unable to process analytics request.'}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### 🔄 Conversation Reset\n\nI am ready for your next question regarding your **${metrics.totalTransactionsCount} verified transactions** (${getFiatSymbol(settings.fiatCurrency)}${metrics.totalRevenueFiat.toLocaleString()} gross volume).`,
        timestamp: Date.now(),
      },
    ]);
  };

  const fiatSym = getFiatSymbol(settings.fiatCurrency);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleGoToHome();
        }
      }}
    >
      <div className="w-full max-w-3xl h-[90dvh] sm:h-[86vh] max-h-[800px] bg-[#0c0e15] border-2 border-zinc-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Ambient background glow accents */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. TOP HEADER: HIGH-CONTRAST NAVIGATION & CONTROLS */}
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b-2 border-zinc-800 bg-[#11131c] flex items-center justify-between shrink-0 z-20">
          {/* Left Action: Direct "Back to Home / POS" Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToHome}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer border border-amber-300"
              title="Return to Home POS Screen"
            >
              <Home className="w-4 h-4" />
              <span>Home (POS)</span>
            </button>

            <div className="hidden xs:flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <h2 className="text-sm font-bold font-display text-white tracking-tight leading-tight">
                  Merchant AI
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {metrics.totalTransactionsCount} verified records
                </span>
              </div>
            </div>
          </div>

          {/* Right Action: Reset and Explicit Close / Cancel Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors cursor-pointer border border-zinc-800"
              title="Reset Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Prominent Close / Cancel Button */}
            <button
              type="button"
              onClick={handleGoToHome}
              className="px-3.5 py-2 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-red-950/70 hover:text-red-200 border-2 border-zinc-600/80 hover:border-red-500/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Cancel & Return to Home"
            >
              <span>Cancel & Exit</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. REAL-TIME LEDGER SNAPSHOT STATS (Interactive Tappable Pills) */}
        <div className="px-3 sm:px-4 py-2 bg-[#141724]/90 border-b border-zinc-800/70 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs shrink-0 z-10">
          <button
            type="button"
            onClick={() => handleSendMessage("What is my total gross sales revenue so far?")}
            className="flex items-center gap-1.5 whitespace-nowrap bg-[#0d0e14] hover:bg-[#1a1e2e] active:scale-95 px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
            title="Ask about Total Gross Sales"
          >
            <span className="text-zinc-500">Gross Sales:</span>
            <span className="font-bold text-amber-400">
              {fiatSym}{metrics.totalRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage("How much did I sell today?")}
            className="flex items-center gap-1.5 whitespace-nowrap bg-[#0d0e14] hover:bg-[#1a1e2e] active:scale-95 px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
            title="Ask about Today's Sales"
          >
            <span className="text-zinc-500">Today:</span>
            <span className="font-bold text-white">
              {fiatSym}{metrics.todayRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage("How much revenue did I make this month?")}
            className="flex items-center gap-1.5 whitespace-nowrap bg-[#0d0e14] hover:bg-[#1a1e2e] active:scale-95 px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
            title="Ask about This Month's Revenue"
          >
            <span className="text-zinc-500">This Month:</span>
            <span className="font-bold text-white">
              {fiatSym}{metrics.thisMonthRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSendMessage("Which crypto token did I receive the most?")}
            className="flex items-center gap-1.5 whitespace-nowrap bg-[#0d0e14] hover:bg-[#1a1e2e] active:scale-95 px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
            title="Ask about Top Token"
          >
            <span className="text-zinc-500">Top Token:</span>
            <span className="font-bold text-amber-300">
              {metrics.mostUsedToken ? `${metrics.mostUsedToken.symbol}` : 'None'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-400 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Real Ledger Safe</span>
          </div>
        </div>

        {/* 3. CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed relative group ${
                    isUser
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black font-medium shadow-md'
                      : 'bg-[#151822] border border-zinc-800/90 text-zinc-200 shadow-xl'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="markdown-body">
                        <Markdown
                          components={{
                            h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-300 leading-normal">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300">{children}</ol>,
                            li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                            code: ({ children }) => (
                              <code className="px-1.5 py-0.5 bg-black/40 border border-zinc-700/60 rounded text-amber-300 font-mono text-[11px]">
                                {children}
                              </code>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2 rounded-xl border border-zinc-700/70 bg-[#0d0f17]">
                                <table className="w-full text-left border-collapse text-xs">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-zinc-800/80 text-zinc-300 font-semibold">{children}</thead>,
                            th: ({ children }) => <th className="p-2 border-b border-zinc-700 font-bold">{children}</th>,
                            td: ({ children }) => <td className="p-2 border-b border-zinc-800/60">{children}</td>,
                          }}
                        >
                          {msg.content}
                        </Markdown>
                      </div>

                      {/* Interactive Action Bar under each Assistant Answer */}
                      {msg.id !== 'welcome' && (
                        <div className="pt-3 mt-1 border-t-2 border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                          {/* 1-Tap Return to Home (POS) button with high-contrast visible border */}
                          <button
                            type="button"
                            onClick={handleGoToHome}
                            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/35 border-2 border-amber-400 text-amber-300 hover:text-white font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md"
                            title="Done reading? Return to POS Terminal"
                          >
                            <Home className="w-4 h-4 text-amber-400" />
                            <span>Done • Exit to Home (POS)</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border-2 border-zinc-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Text</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Generation State with Immediate Stop/Cancel Action */}
          {isLoading && (
            <div className="flex gap-2.5 sm:gap-3 justify-start items-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#151822] border-2 border-zinc-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-300 flex-1 max-w-[90%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Analyzing verified transaction records with Gemini 3.7 Flash...</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelQuery}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 border-2 border-red-400"
                  title="Stop AI Generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop / Cancel</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. QUICK SUGGESTED QUESTIONS CAROUSEL */}
        <div className="px-3 sm:px-4 py-2 bg-[#0f1118] border-t-2 border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 whitespace-nowrap flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" />
              <span>Ask:</span>
            </span>
            {CATEGORIZED_PROMPTS.flatMap((c) => c.items).map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-[#171b26] hover:bg-[#1f2433] active:scale-95 border border-zinc-700/60 hover:border-amber-500/50 text-zinc-300 hover:text-white text-xs rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Icon className="w-3 h-3 text-amber-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. INPUT & PROMINENT HIGH-VISIBILITY BOTTOM DOCK WITH VISIBLE EDGES */}
        <div className="p-3 sm:p-4 bg-[#111420] border-t-2 border-zinc-700 shrink-0 space-y-2.5 shadow-2xl z-20">
          {/* Main Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask about sales, tokens, best day, revenue..."
                disabled={isLoading}
                className="w-full bg-[#08090f] border-2 border-zinc-700/80 focus:border-amber-400 rounded-2xl pl-4 pr-9 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
              />
              {inputPrompt.length > 0 && !isLoading && (
                <button
                  type="button"
                  onClick={() => setInputPrompt('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-md cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isLoading ? (
              <button
                type="button"
                onClick={handleCancelQuery}
                className="px-4 sm:px-5 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border-2 border-red-400"
                title="Cancel ongoing query"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputPrompt.trim()}
                className="px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs sm:text-sm rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-amber-300"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask</span>
              </button>
            )}
          </form>

          {/* DEDICATED PROMINENT CANCEL & EXIT BAR WITH VISIBLE BORDERS AND HIGH CONTRAST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            {/* 1. Main Primary Action: Exit to Home (POS) with Glowing Amber/Gold Edges */}
            <button
              type="button"
              onClick={handleGoToHome}
              className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-black font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 border-2 border-amber-200 flex items-center justify-center gap-2 cursor-pointer ring-2 ring-amber-400/40"
              title="Exit AI and return to POS Terminal"
            >
              <Home className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="uppercase tracking-wide">Exit to Home (POS)</span>
            </button>

            {/* 2. Secondary Cancel Button with Sharp Red/Zinc Visible Border */}
            <button
              type="button"
              onClick={handleGoToHome}
              className="w-full py-2.5 sm:py-3 px-4 bg-[#181b28] hover:bg-red-950/60 active:scale-[0.98] text-zinc-200 hover:text-white font-bold text-xs sm:text-sm rounded-xl transition-all border-2 border-zinc-600 hover:border-red-400 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              title="Cancel and close AI Assistant"
            >
              <X className="w-4 h-4 text-red-400 stroke-[2.5]" />
              <span>Cancel / Close AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getFiatSymbol(fiat: string): string {
  const map: Record<string, string> = {
    USD: '$',
    NGN: '₦',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    JPY: '¥',
    CHF: 'CHF',
    ZAR: 'R',
    KES: 'KSh',
    GHS: 'GH₵',
  };
  return map[fiat] || '$';
}
