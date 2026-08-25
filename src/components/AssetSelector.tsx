import React from 'react';
import { CryptoAsset, AssetBalance } from '../types/merchant';
import { SUPPORTED_ASSETS, ASSET_ORDER } from '../config/constants';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { RefreshCw } from 'lucide-react';

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
      <div className="flex items-center justify-between mb-1 sm:mb-1.5 px-1">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-zinc-400">
          {getTranslation(language, 'paymentAsset')}
        </span>
        <button
          type="button"
          onClick={onRefreshBalances}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-400 hover:text-amber-400 transition-colors p-0.5 rounded cursor-pointer"
          title="Refresh on-chain balances"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">{getTranslation(language, 'syncBalances')}</span>
        </button>
      </div>

      {/* 5 Asset Cards in responsive grid */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {ASSET_ORDER.map((symbol) => {
          const config = SUPPORTED_ASSETS[symbol];
          const isSelected = selectedAsset === symbol;
          const balanceData = balances[symbol];

          return (
            <button
              key={symbol}
              type="button"
              onClick={() => onSelectAsset(symbol)}
              className={`relative flex flex-col items-center justify-between py-1.5 px-1 rounded-xl transition-all duration-150 text-center cursor-pointer min-h-[64px] sm:min-h-[70px] ${
                isSelected
                  ? 'bg-amber-500/10 border-2 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40 text-amber-400'
                  : 'bg-[#12141a] border border-zinc-800/80 hover:border-zinc-700 hover:bg-[#181a22] text-zinc-300'
              }`}
            >
              {/* Asset Official Logo */}
              <div className="relative mb-0.5">
                <CryptoAssetIcon asset={symbol} size="sm" />
              </div>

              {/* Symbol & Network Name */}
              <div className="flex flex-col items-center w-full leading-tight">
                <span
                  className={`text-[11px] sm:text-xs font-extrabold tracking-tight font-display ${
                    isSelected ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {symbol}
                </span>
                <span className="text-[8px] sm:text-[9px] text-zinc-500 font-medium truncate max-w-full">
                  {config.network === 'Polygon' ? 'Polygon' : config.network === 'Ethereum' ? 'Ethereum' : 'Bitcoin'}
                </span>
              </div>

              {/* Bottom Real Balance Display */}
              <div className="w-full mt-0.5 pt-0.5 border-t border-zinc-800/50">
                {balanceData?.isLoading ? (
                  <div className="h-2.5 w-6 bg-zinc-800 animate-pulse rounded mx-auto" />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono font-bold tracking-tight truncate max-w-full ${
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
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#0a0b0e]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
