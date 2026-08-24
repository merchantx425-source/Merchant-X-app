import React from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { ASSET_ORDER, SUPPORTED_ASSETS } from '../../config/constants';
import { RefreshCw, Wallet, AlertCircle } from 'lucide-react';
import { formatAddress } from '../../services/blockchainService';

interface BalanceDisplayProps {
  onOpenWalletModal: () => void;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ onOpenWalletModal }) => {
  const { wallet, balances, refreshBalances, settings } = useMerchant();

  const isAnyWalletConnected = Boolean(
    wallet.isConnected || wallet.evmAddress || wallet.btcAddress || settings.customEvmReceivingAddress || settings.customBtcReceivingAddress
  );

  return (
    <div className="w-full max-w-sm mx-auto mb-3 bg-[#11131a] border border-slate-800/80 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white font-['Outfit']">
                Merchant Wallet
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isAnyWalletConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-['JetBrains_Mono']">
              {wallet.evmAddress
                ? formatAddress(wallet.evmAddress, 4)
                : settings.customEvmReceivingAddress
                ? formatAddress(settings.customEvmReceivingAddress, 4)
                : 'No EVM Wallet Set'}
              {wallet.btcAddress || settings.customBtcReceivingAddress ? (
                <span className="text-slate-400 ml-1">
                  • BTC:{' '}
                  {formatAddress(
                    wallet.btcAddress || settings.customBtcReceivingAddress,
                    3
                  )}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => refreshBalances()}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Refresh on-chain balances"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenWalletModal}
            className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
          >
            {isAnyWalletConnected ? 'Manage' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Real on-chain balances row */}
      <div className="grid grid-cols-5 gap-1 pt-2">
        {ASSET_ORDER.map((asset) => {
          const bal = balances[asset];
          const config = SUPPORTED_ASSETS[asset];

          return (
            <div
              key={asset}
              className="flex flex-col items-center justify-center p-1 rounded-lg bg-[#161922] border border-slate-800/40 text-center"
            >
              <span className="text-[9px] font-bold text-slate-400">
                {asset}
              </span>
              
              {bal?.isLoading ? (
                <span className="text-[10px] text-slate-500 animate-pulse font-['JetBrains_Mono']">...</span>
              ) : bal?.error ? (
                <div className="flex items-center gap-0.5 text-[8px] text-red-400" title={bal.error}>
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Error</span>
                </div>
              ) : (
                <span className="text-[10.5px] font-semibold text-white font-['JetBrains_Mono'] truncate max-w-full">
                  {bal?.balance || '0'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
