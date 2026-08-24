import React from 'react';
import { CryptoAsset, AssetBalance } from '../types/merchant';
import { SUPPORTED_ASSETS, ASSET_ORDER } from '../config/constants';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface AssetSelectorProps {
  selectedAsset: CryptoAsset;
  onSelectAsset: (asset: CryptoAsset) => void;
  balances: Record<CryptoAsset, AssetBalance>;
  onRefreshBalances: () => void;
  isRefreshing: boolean;
  language?: string;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  selectedAsset,
  onSelectAsset,
  balances,
  onRefreshBalances,
  isRefreshing,
  language = 'en',
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
          {getTranslation(language, 'paymentAsset')}
        </span>
        <button
          type="button"
          onClick={onRefreshBalances}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 transition-colors p-1 rounded cursor-pointer"
          title="Refresh on-chain balances"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">{getTranslation(language, 'syncBalances')}</span>
        </button>
      </div>

      {/* 5 Asset Cards in responsive grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {ASSET_ORDER.map((symbol) => {
          const config = SUPPORTED_ASSETS[symbol];
          const isSelected = selectedAsset === symbol;
          const balanceData = balances[symbol];

          return (
            <button
              key={symbol}
              type="button"
              onClick={() => onSelectAsset(symbol)}
              className={`relative flex flex-col items-center justify-between py-2 px-1 sm:px-1.5 rounded-xl transition-all duration-150 text-center cursor-pointer min-h-[78px] ${
                isSelected
                  ? 'bg-amber-500/10 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40 text-amber-400'
                  : 'bg-[#12141a] border border-zinc-800/80 hover:border-zinc-700 hover:bg-[#181a22] text-zinc-300'
              }`}
            >
              {/* Asset Official Logo */}
              <div className="relative mb-1">
                <CryptoAssetIcon asset={symbol} size="md" />
              </div>

              {/* Symbol & Network Name */}
              <div className="flex flex-col items-center w-full leading-tight">
                <span
                  className={`text-xs sm:text-sm font-extrabold tracking-tight font-display ${
                    isSelected ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {symbol}
                </span>
                <span className="text-[9px] text-zinc-500 font-medium truncate max-w-full">
                  {config.network === 'Polygon' ? 'Polygon' : config.network === 'Ethereum' ? 'Ethereum' : 'Bitcoin'}
                </span>
              </div>

              {/* Bottom Real Balance Display */}
              <div className="w-full mt-1 pt-1 border-t border-zinc-800/50">
                {balanceData?.isLoading ? (
                  <div className="h-3 w-8 bg-zinc-800 animate-pulse rounded mx-auto" />
                ) : balanceData?.error ? (
                  <div
                    className="text-[9px] text-red-400/90 font-medium truncate px-0.5 flex items-center justify-center gap-0.5"
                    title={balanceData.error}
                  >
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span>0</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-tight truncate max-w-full ${
                        isSelected ? 'text-zinc-100' : 'text-zinc-400'
                      }`}
                    >
                      {balanceData?.balance ?? '0'}
                    </span>
                  </div>
                )}
              </div>

              {/* Selection Dot */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0a0b0e]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
