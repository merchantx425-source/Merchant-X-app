import React, { useState, useMemo } from 'react';
import { CurrencyItem, ALL_CURRENCIES, CurrencyType } from '../../services/currencyRateService';
import { Search, X, Check, Globe, Coins } from 'lucide-react';

interface CurrencySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (currency: CurrencyItem) => void;
  selectedCurrencyId: string;
  title: string;
  subtitle?: string;
  filterType?: CurrencyType | 'all';
}

export const CurrencySelectModal: React.FC<CurrencySelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCurrencyId,
  title,
  subtitle,
  filterType = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'crypto' | 'fiat'>(filterType);

  const filteredCurrencies = useMemo(() => {
    let list = ALL_CURRENCIES;

    if (activeFilter !== 'all') {
      list = list.filter((c) => c.type === activeFilter);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [searchQuery, activeFilter]);

  if (!isOpen) return null;

  return (
    <div
      id="currency-select-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="currency-select-modal"
        className="relative w-full max-w-md bg-[#0e1017] border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141724] border-b border-zinc-800/80">
          <div>
            <h3 className="text-base font-bold font-display text-white">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            id="btn-close-currency-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Tabs */}
        <div className="p-4 bg-[#0e1017] border-b border-zinc-800/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="currency-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currency, token or code (e.g. NGN, VERSE, USD, BTC)..."
              autoFocus
              className="w-full bg-[#161a28] border border-zinc-700/80 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#141724] rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('crypto')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeFilter === 'crypto'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Crypto</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('fiat')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeFilter === 'fiat'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Fiat</span>
            </button>
          </div>
        </div>

        {/* Currency List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[260px] max-h-[420px]">
          {filteredCurrencies.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-medium text-zinc-400">No matching currencies found</p>
              <p className="text-xs text-zinc-500">Try searching for "USD", "BTC", "VERSE", or "NGN"</p>
            </div>
          ) : (
            filteredCurrencies.map((item) => {
              const isSelected = item.id === selectedCurrencyId;
              return (
                <button
                  key={item.id}
                  id={`currency-item-${item.id.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm shadow-amber-500/10'
                      : 'bg-[#121522]/70 hover:bg-[#181c2d] border-zinc-800/60 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon or Flag */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700/60 shadow-inner"
                      style={{
                        backgroundColor:
                          item.type === 'crypto'
                            ? `${item.iconColor || '#f59e0b'}20`
                            : '#1f2438',
                        color: item.type === 'crypto' ? item.iconColor || '#f59e0b' : '#f4f4f5',
                      }}
                    >
                      {item.type === 'fiat' ? (
                        <span className="text-lg leading-none">{item.flag || item.symbol}</span>
                      ) : (
                        <span className="font-black text-xs">{item.code.slice(0, 4)}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">{item.code}</span>
                        {item.type === 'crypto' && item.badge && (
                          <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold rounded-md uppercase">
                            {item.badge}
                          </span>
                        )}
                        {item.type === 'fiat' && (
                          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-medium rounded-md uppercase">
                            Fiat
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{item.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 font-bold">{item.symbol}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
