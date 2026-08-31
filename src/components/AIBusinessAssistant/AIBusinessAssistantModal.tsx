import React, { useState, useEffect, useRef } from 'react';
import {
  TransactionRecord,
  AppSettings,
  WalletState,
  SubscriptionState,
} from '../../types/merchant';
import {
  BusinessMetrics,
  computeBusinessMetrics,
  queryAIBusinessAssistant,
  ChatMessage,
} from '../../services/aiAssistantService';
import { MerchantXLogo } from '../MerchantXLogo';
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
  ChevronRight,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface AIBusinessAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
  settings: AppSettings;
  walletState: WalletState;
  subscriptionState?: SubscriptionState;
  cryptoRatesUsd?: Record<string, number>;
  cryptoInFiatRates?: Record<string, number>;
  initialPrompt?: string | null;
}

const SUGGESTED_QUESTIONS = [
  { label: "Today's sales", icon: Calendar, prompt: "How much did I sell today?" },
  { label: "This month's revenue", icon: TrendingUp, prompt: "How much revenue did I make this month?" },
  { label: "Best performing day", icon: Zap, prompt: "What was my best sales day?" },
  { label: "Recent transactions", icon: Receipt, prompt: "Show me my recent transactions." },
  { label: "Sales comparison", icon: BarChart3, prompt: "Compare my sales this month with last month. Are my sales increasing or decreasing?" },
  { label: "Token breakdown", icon: Coins, prompt: "Which payment token is used the most? How much VERSE, USDT, and BTC did I receive?" },
  { label: "Payment discrepancies", icon: AlertCircle, prompt: "How many payments were underpaid and overpaid?" },
  { label: "Business performance", icon: Sparkles, prompt: "Give me a complete summary of my business performance and tell me what I should pay attention to based on my sales data." },
];

export const AIBusinessAssistantModal: React.FC<AIBusinessAssistantModalProps> = ({
  isOpen,
  onClose,
  transactions,
  settings,
  walletState,
  subscriptionState,
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
      content: `### 👋 Welcome to your AI Business Assistant\n\nI have connected directly to your **Merchant X live transaction ledger** (${transactions.length} total records).\n\nYou can ask me any question about your **sales volume, payment tokens (VERSE, USDT, BTC, ETH), customer transactions, month-over-month comparisons**, or **payment discrepancies**.\n\n*Tap any suggested question below or type your inquiry.*`,
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputPrompt).trim();
    if (!queryText || isLoading) return;

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

    // Prepare real context
    const contextPayload = {
      merchantName: settings.merchantName || 'Merchant Terminal',
      merchantLocation: settings.merchantLocation || 'Global',
      fiatCurrency: settings.fiatCurrency || 'USD',
      fiatSymbol: getFiatSymbol(settings.fiatCurrency),
      transactions,
      metrics,
      walletState,
      subscriptionState,
      liveRates: cryptoInFiatRates,
      liveRatesUsd: cryptoRatesUsd,
      clientTime: new Date().toISOString(),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      const res = await queryAIBusinessAssistant(queryText, contextPayload);
      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: res.answer,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
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
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### 🔄 Conversation Reset\n\nI am ready for your next question regarding your **${metrics.totalTransactionsCount} live transactions** (${getFiatSymbol(settings.fiatCurrency)}${metrics.totalRevenueFiat.toLocaleString()} gross volume).`,
        timestamp: Date.now(),
      },
    ]);
  };

  const fiatSym = getFiatSymbol(settings.fiatCurrency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[92vh] sm:h-[85vh] bg-[#0c0e15] border border-zinc-800/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Background glow accents */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-[#10121a]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-white tracking-tight">
                  AI Business Assistant
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold rounded-md uppercase">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected to real ledger ({metrics.totalTransactionsCount} records)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
              title="Reset Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Real-Time Snapshot Bar (Live metrics) */}
        <div className="px-4 py-2 bg-[#141724]/70 border-b border-zinc-800/60 flex items-center gap-3 overflow-x-auto no-scrollbar text-xs shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">Gross Sales:</span>
            <span className="font-bold text-amber-400">
              {fiatSym}{metrics.totalRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">Today:</span>
            <span className="font-bold text-white">
              {fiatSym}{metrics.todayRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({metrics.todayCount} txs)
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">This Month:</span>
            <span className="font-bold text-white">
              {fiatSym}{metrics.thisMonthRevenueFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">Top Token:</span>
            <span className="font-bold text-amber-300">
              {metrics.mostUsedToken ? `${metrics.mostUsedToken.symbol} (${metrics.mostUsedToken.count})` : 'None yet'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap text-zinc-300 bg-[#0d0e14] px-2.5 py-1 rounded-lg border border-zinc-800">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-zinc-400">Read-Only Safety</span>
          </div>
        </div>

        {/* 3. Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative group ${
                    isUser
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black font-medium shadow-md'
                      : 'bg-[#151822] border border-zinc-800/90 text-zinc-200 shadow-xl'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <div className="space-y-2 prose-invert">
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

                      {/* Copy Message Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
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

          {/* Loading Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="bg-[#151822] border border-zinc-800/90 rounded-2xl p-3.5 shadow-lg flex items-center gap-2.5 text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Analyzing real ledger records with Gemini 3.7 Flash...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Suggested Questions Carousel */}
        <div className="px-4 py-2.5 bg-[#0f1118] border-t border-zinc-800/70 shrink-0">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Suggested Questions:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SUGGESTED_QUESTIONS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-[#171b26] hover:bg-[#1f2433] active:scale-95 border border-zinc-700/60 hover:border-amber-500/50 text-zinc-300 hover:text-white text-xs rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Input Bar */}
        <div className="p-3 sm:p-4 bg-[#10121a] border-t border-zinc-800/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask about sales, tokens, best day, revenue..."
              disabled={isLoading}
              className="flex-1 bg-[#090b10] border border-zinc-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-4 sm:px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:pointer-events-none text-black font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 px-1">
            <span>Powered by Merchant X Real-Ledger Analytics & Gemini 3.7 Flash</span>
            <span>Read-Only • Safe</span>
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
