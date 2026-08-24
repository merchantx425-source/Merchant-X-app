import React, { useState, useMemo } from 'react';
import { CryptoAsset, FiatCurrency, AssetBalance, WalletState, AppSettings } from '../types/merchant';
import { SUPPORTED_FIAT, SUPPORTED_ASSETS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { MerchantXLogo } from './MerchantXLogo';
import { AssetSelector } from './AssetSelector';
import { NumericKeypad } from './NumericKeypad';
import { Settings as SettingsIcon, Wallet, RefreshCw, AlertCircle } from 'lucide-react';

interface POSProps {
  amountInput: string;
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  onClearPress: () => void;
  selectedAsset: CryptoAsset;
  onSelectAsset: (asset: CryptoAsset) => void;
  balances: Record<CryptoAsset, AssetBalance>;
  onRefreshBalances: () => void;
  isRefreshingBalances: boolean;
  cryptoInFiatRates: Record<CryptoAsset, number>;
  onCharge: () => void;
  walletState: WalletState;
  onOpenWalletModal: () => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

export const POS: React.FC<POSProps> = ({
  amountInput,
  onDigitPress,
  onDeletePress,
  onClearPress,
  selectedAsset,
  onSelectAsset,
  balances,
  onRefreshBalances,
  isRefreshingBalances,
  cryptoInFiatRates,
  onCharge,
  walletState,
  onOpenWalletModal,
  onOpenSettings,
  settings,
}) => {
  const fiatConfig = SUPPORTED_FIAT[settings.fiatCurrency];

  // Numeric amount calculation
  const numericAmount = useMemo(() => {
    if (!amountInput || amountInput === '' || amountInput === '.') return 0;
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [amountInput]);

  // Formatted fiat text (e.g. ₦5,000 or ₦0)
  const formattedFiatDisplay = useMemo(() => {
    if (numericAmount === 0) {
      return `${fiatConfig.symbol}0`;
    }
    // Handle decimals if user entered a period
    if (amountInput.includes('.')) {
      const [intPart, decPart] = amountInput.split('.');
      const formattedInt = parseInt(intPart || '0', 10).toLocaleString('en-US');
      return `${fiatConfig.symbol}${formattedInt}.${decPart}`;
    }
    return `${fiatConfig.symbol}${numericAmount.toLocaleString('en-US')}`;
  }, [numericAmount, amountInput, fiatConfig.symbol]);

  // Crypto conversion
  const estimatedCryptoAmount = useMemo(() => {
    const rateInFiat = cryptoInFiatRates[selectedAsset] || 1;
    if (rateInFiat <= 0 || numericAmount <= 0) return 0;
    return numericAmount / rateInFiat;
  }, [numericAmount, selectedAsset, cryptoInFiatRates]);

  const chargeButtonLabel = useMemo(() => {
    if (numericAmount === 0) {
      return `CHARGE ${fiatConfig.symbol}0`;
    }
    return `CHARGE ${fiatConfig.symbol}${numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }, [numericAmount, fiatConfig.symbol]);

  const isChargeDisabled = numericAmount <= 0;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between min-h-[calc(100vh-5rem)] sm:min-h-[640px] px-3 sm:px-4 py-2 select-none">
      {/* 1. Terminal Top Bar */}
      <header className="flex items-center justify-between py-2 border-b border-purple-900/20">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <MerchantXLogo size="sm" />
          <span className="font-extrabold text-lg sm:text-xl font-display tracking-tight text-white">
            Merchant <span className="text-amber-400">X</span>
          </span>
        </div>

        {/* Right Action Icons: Wallet Status & Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenWalletModal}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              walletState.isConnected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-[#181a24] border-zinc-700/80 text-zinc-300 hover:text-white hover:border-amber-500/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px]">
              {walletState.isConnected
                ? walletState.evmAddress
                  ? formatAddress(walletState.evmAddress, 3)
                  : walletState.btcAddress
                  ? formatAddress(walletState.btcAddress, 3)
                  : 'Connected'
                : 'Connect'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
            title="Terminal Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Amount Display Area (Large & Centered) */}
      <section className="flex flex-col items-center justify-center py-4 sm:py-6 text-center my-auto">
        <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1 font-mono">
          Enter Amount
        </div>

        {/* Large Amount */}
        <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-white break-all px-2 transition-all">
          {formattedFiatDisplay}
        </div>

        {/* Crypto conversion subtitle */}
        <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono text-amber-400 font-semibold mt-1">
          <span>≈</span>
          <span>{formatCryptoAmount(estimatedCryptoAmount, selectedAsset)} {selectedAsset}</span>
          <span className="text-[10px] text-zinc-400 font-sans">
            ({SUPPORTED_ASSETS[selectedAsset].network})
          </span>
        </div>
      </section>

      {/* 3. Crypto Asset Selection */}
      <section className="my-2">
        <AssetSelector
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
          balances={balances}
          onRefreshBalances={onRefreshBalances}
          isRefreshing={isRefreshingBalances}
        />
      </section>

      {/* 4. Large Numeric Keypad & Charge Button */}
      <section className="mt-2 pb-2">
        <NumericKeypad
          onDigitPress={onDigitPress}
          onDeletePress={onDeletePress}
          onClearPress={onClearPress}
          onChargePress={onCharge}
          chargeFormattedText={chargeButtonLabel}
          isChargeDisabled={isChargeDisabled}
          hapticEnabled={settings.hapticEnabled}
        />
      </section>
    </div>
  );
};
