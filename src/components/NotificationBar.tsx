import React, { useState } from 'react';
import { CryptoAsset, WalletState } from '../types/merchant';
import { formatAddress } from '../services/blockchainService';
import { Radio, CheckCircle, RefreshCw, X, Zap, Lock, Fingerprint } from 'lucide-react';

interface NotificationBarProps {
  walletState: WalletState;
  selectedAsset: CryptoAsset;
  ratesError?: string | null;
  onRefreshRates?: () => void;
  isRefreshingBalances?: boolean;
  biometricEnabled?: boolean;
  onLockTerminal?: () => void;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  walletState,
  selectedAsset,
  ratesError,
  onRefreshRates,
  isRefreshingBalances,
  biometricEnabled,
  onLockTerminal,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-[#11131a] border-b border-zinc-800/80 px-3 py-1.5 transition-all text-xs">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left Status Indicator */}
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          <div className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
            {ratesError ? (
              <span className="text-amber-400 font-medium truncate flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Ticker connecting...
              </span>
            ) : walletState.isConnected ? (
              <span className="text-zinc-300 font-medium truncate flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-semibold">Live POS</span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-300 font-mono">
                  {formatAddress(walletState.evmAddress || walletState.btcAddress, 3)}
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-amber-400 font-bold">{selectedAsset}</span>
              </span>
            ) : (
              <span className="text-zinc-300 font-medium truncate flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-amber-400 font-semibold">POS Ready</span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-400 truncate">Multichain Verse, POL, USDT, ETH, BTC</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {biometricEnabled && onLockTerminal && (
            <button
              type="button"
              onClick={onLockTerminal}
              className="px-2 py-0.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 text-purple-300 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
              title="Lock Terminal with Biometrics"
            >
              <Fingerprint className="w-2.5 h-2.5 text-purple-400" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          )}

          {onRefreshRates && (
            <button
              type="button"
              onClick={onRefreshRates}
              disabled={isRefreshingBalances}
              className="p-1 text-zinc-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingBalances ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
