import React from 'react';
import { AppTab } from '../types/merchant';
import { getTranslation } from '../config/i18n';
import { LayoutGrid, Receipt, Settings as SettingsIcon, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  pendingCount?: number;
  isPro?: boolean;
  language?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  pendingCount = 0,
  isPro = false,
  language = 'en',
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0e14]/95 backdrop-blur-lg border-t border-purple-950/40 px-2 sm:px-4 py-2 sm:py-2.5 max-w-md mx-auto no-print">
      <div className="flex items-center justify-around">
        {/* POS Tab */}
        <button
          type="button"
          onClick={() => onTabChange('pos')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentTab === 'pos'
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <LayoutGrid className="w-5 h-5" />
            {currentTab === 'pos' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-wide uppercase font-medium">
            {getTranslation(language, 'pos')}
          </span>
        </button>

        {/* Transactions Tab */}
        <button
          type="button"
          onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'transactions'
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Receipt className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-black rounded-full">
                {pendingCount}
              </span>
            )}
            {currentTab === 'transactions' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-wide uppercase font-medium">
            {getTranslation(language, 'history')}
          </span>
        </button>

        {/* Subscription / Plan Tab */}
        <button
          type="button"
          onClick={() => onTabChange('subscription')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'subscription'
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5" />
            {isPro && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-amber-400 text-black text-[8px] font-black rounded">
                PRO
              </span>
            )}
            {currentTab === 'subscription' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-wide uppercase font-medium">
            {getTranslation(language, 'plan')}
          </span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentTab === 'settings'
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            <SettingsIcon className="w-5 h-5" />
            {currentTab === 'settings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-wide uppercase font-medium">
            {getTranslation(language, 'settings')}
          </span>
        </button>
      </div>
    </nav>
  );
};

