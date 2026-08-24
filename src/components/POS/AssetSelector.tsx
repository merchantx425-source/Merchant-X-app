import React from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { ASSET_ORDER, SUPPORTED_ASSETS } from '../../config/constants';
import { CryptoAsset } from '../../types/merchant';
import { formatCryptoAmount } from '../../services/blockchainService';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface AssetSelectorProps {
  enteredFiatAmount: number;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({ enteredFiatAmount }) => {
  const {
    selectedAsset,
    setSelectedAsset,
    balances,
    rates,
    refreshBalances,
    settings,
    wallet,
  } = useMerchant();

  return (
    <div className="w-full max-w-sm mx-auto mb-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Payment Asset
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => refreshBalances()}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer px-1 py-0.5 rounded"
            title="Refresh on-chain balances"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Grid of 5 supported assets */}
      <div className="grid grid-cols-5 gap-1.5">
        {ASSET_ORDER.map((asset) => {
          const isSelected = selectedAsset === asset;
          const config = SUPPORTED_ASSETS[asset];
          const bal = balances[asset];

          // Compute equivalent crypto amount if fiat amount > 0
          const fiatRate = rates.cryptoInFiat[asset] || 1;
          const cryptoEquivalent = enteredFiatAmount > 0 ? enteredFiatAmount / fiatRate : null;

          return (
            <button
              key={asset}
              type="button"
              onClick={() => setSelectedAsset(asset)}
              className={`relative flex flex-col items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none text-left min-h-[72px] ${
                isSelected
                  ? 'bg-gradient-to-b from-[#ff7a00]/15 to-[#ff7a00]/5 border-[#ff7a00] shadow-[0_0_12px_rgba(255,122,0,0.25)]'
                  : 'bg-[#14161f] border-slate-800/80 hover:border-slate-700 hover:bg-[#1a1d28]'
              }`}
            >
              {/* Asset Header & Network Indicator */}
              <div className="w-full flex items-center justify-between">
                <span
                  className={`font-bold font-['Outfit'] text-xs tracking-tight ${
                    isSelected ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {asset}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: config.iconColor }}
                  title={`${config.name} (${config.network})`}
                />
              </div>

              {/* Network Pill */}
              <span className="text-[8.5px] font-medium text-slate-400 tracking-tight self-start truncate max-w-full">
                {asset === 'BTC' ? 'BTC' : asset === 'ETH' ? 'ETH' : 'Polygon'}
              </span>

              {/* Balance / Estimated Amount */}
              <div className="w-full mt-1 pt-1 border-t border-slate-800/50 flex flex-col">
                {cryptoEquivalent !== null ? (
                  <span className="text-[9.5px] font-semibold text-amber-300 truncate font-['JetBrains_Mono']">
                    {formatCryptoAmount(cryptoEquivalent, asset)}
                  </span>
                ) : bal?.isLoading ? (
                  <span className="text-[9px] text-slate-500 animate-pulse">...</span>
                ) : bal?.error ? (
                  <span className="text-[8px] text-red-400 truncate" title="Balance error">
                    !
                  </span>
                ) : (
                  <span className="text-[9px] font-medium text-slate-400 truncate font-['JetBrains_Mono']">
                    {bal?.balance || '0'}
                  </span>
                )}
              </div>

              {/* Selected highlight badge */}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ff7a00] rounded-full ring-2 ring-[#0a0b0e]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
