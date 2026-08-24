import React from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { AppTab } from '../../types/merchant';
import { Calculator, Receipt, Settings as SettingsIcon } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, transactions } = useMerchant();

  const tabs: { id: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'pos', label: 'POS Terminal', icon: Calculator },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label="Terminal Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14]/95 backdrop-blur-md border-t border-slate-800/80 safe-area-bottom select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 h-16 px-3">
        {tabs.map((tab) => {
          const isSelected = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                isSelected
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isSelected ? 'scale-110' : ''
                  }`}
                />
                {tab.id === 'transactions' && transactions.length > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {transactions.length > 99 ? '99+' : transactions.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-['Outfit'] tracking-wide">
                {tab.label}
              </span>

              {/* Active indicator bar */}
              {isSelected && (
                <span className="absolute top-0 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
