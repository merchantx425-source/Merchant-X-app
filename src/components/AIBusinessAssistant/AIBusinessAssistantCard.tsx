import React from 'react';
import { TransactionRecord, AppSettings } from '../../types/merchant';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  Receipt,
  BarChart3,
  MessageSquare,
  Coins,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface AIBusinessAssistantCardProps {
  transactions: TransactionRecord[];
  settings: AppSettings;
  onOpenAssistant: (initialPrompt?: string) => void;
}

const QUICK_PROMPTS = [
  { label: "Today's sales", prompt: "How much did I sell today?", icon: Calendar },
  { label: "This month's revenue", prompt: "How much revenue did I make this month?", icon: TrendingUp },
  { label: "Best performing day", prompt: "What was my best sales day?", icon: Zap },
  { label: "Recent transactions", prompt: "Show me my recent transactions.", icon: Receipt },
  { label: "Sales comparison", prompt: "Compare my sales this month with last month. Are my sales increasing or decreasing?", icon: BarChart3 },
];

export const AIBusinessAssistantCard: React.FC<AIBusinessAssistantCardProps> = ({
  transactions,
  settings,
  onOpenAssistant,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Business Assistant</span>
        </h2>
        <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gemini 3.7 Flash</span>
        </span>
      </div>

      <div className="bg-gradient-to-br from-[#161a26] to-[#10121a] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden space-y-4">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ask AI About Your Business</span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold rounded">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Ask natural-language questions about your sales, revenue, payment tokens (VERSE, USDT, BTC), customer volume, and monthly trends using your real ledger data.
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Quick Question Chips */}
        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Popular Questions:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenAssistant(item.prompt)}
                  className="px-2.5 py-1.5 bg-[#0d0f17] hover:bg-[#1a1e2c] border border-zinc-800 hover:border-amber-500/50 text-zinc-300 hover:text-white text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAssistant()}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open AI Business Assistant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
