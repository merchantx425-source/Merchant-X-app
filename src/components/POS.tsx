import React, { useMemo, useState } from 'react';
import { CryptoAsset, AssetBalance, WalletState, AppSettings } from '../types/merchant';
import { SUPPORTED_FIAT, SUPPORTED_ASSETS } from '../config/constants';
import { formatCryptoAmount, formatAddress, formatCryptoMarketPrice } from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { MerchantXLogo } from './MerchantXLogo';
import { AssetSelector } from './AssetSelector';
import { NumericKeypad } from './NumericKeypad';
import { openWalletModal } from '../config/appkit';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';

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
  onOpenSettings?: () => void;
  settings: AppSettings;
  onRefreshRates?: () => void;
  ratesError?: string | null;
  lastRatesUpdated?: number;
  isPro?: boolean;
  freeTransactionsRemaining?: number;
  onNavigateToSubscription?: () => void;
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
  onRefreshRates,
  ratesError,
  lastRatesUpdated,
  isPro = false,
  freeTransactionsRemaining = 10,
  onNavigateToSubscription,
}) => {
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);
  const [isOpeningWallet, setIsOpeningWallet] = useState(false);

  const fiatConfig = SUPPORTED_FIAT[settings.fiatCurrency];
  const lang = settings.language;
  const assetConfig = SUPPORTED_ASSETS[selectedAsset];

  // Numeric amount calculation
  const numericAmount = useMemo(() => {
    if (!amountInput || amountInput === '' || amountInput === '.') return 0;
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [amountInput]);

  // Formatted fiat text (e.g. ₦50,000 or ₦0)
  const formattedFiatDisplay = useMemo(() => {
    if (numericAmount === 0) {
      return `${fiatConfig.symbol}0`;
    }
    if (amountInput.includes('.')) {
      const [intPart, decPart] = amountInput.split('.');
      const formattedInt = parseInt(intPart || '0', 10).toLocaleString('en-US');
      return `${fiatConfig.symbol}${formattedInt}.${decPart}`;
    }
    return `${fiatConfig.symbol}${numericAmount.toLocaleString('en-US')}`;
  }, [numericAmount, amountInput, fiatConfig.symbol]);

  // Current market price
  const marketPrice = cryptoInFiatRates[selectedAsset] || 0;

  // Crypto conversion
  const estimatedCryptoAmount = useMemo(() => {
    if (marketPrice <= 0 || numericAmount <= 0) return 0;
    return numericAmount / marketPrice;
  }, [numericAmount, marketPrice]);

  const chargeLabel = getTranslation(lang, 'charge');

  const chargeButtonLabel = useMemo(() => {
    if (numericAmount === 0) {
      return `${chargeLabel} ${fiatConfig.symbol}0`;
    }
    return `${chargeLabel} ${fiatConfig.symbol}${numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }, [numericAmount, fiatConfig.symbol, chargeLabel]);

  const isChargeDisabled = numericAmount <= 0;

  // Direct trigger for Web3 Wallet Connect Modal
  const handleConnectWalletClick = async () => {
    setWalletConnectError(null);
    setIsOpeningWallet(true);
    try {
      const res = await openWalletModal();
      if (!res.success) {
        setWalletConnectError(res.error || 'Wallet connection unavailable.');
      }
    } catch {
      setWalletConnectError('Wallet connection unavailable.');
    } finally {
      setIsOpeningWallet(false);
    }
  };

  // Active connected address to display
  const connectedDisplayAddress = useMemo(() => {
    if (!walletState.isConnected) return null;
    if (assetConfig.networkFamily === 'bitcoin' && walletState.btcAddress) {
      return formatAddress(walletState.btcAddress, 4);
    }
    if (walletState.evmAddress) {
      return formatAddress(walletState.evmAddress, 4);
    }
    if (walletState.btcAddress) {
      return formatAddress(walletState.btcAddress, 4);
    }
    return 'Connected';
  }, [walletState, assetConfig.networkFamily]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-between px-3 sm:px-4 pt-1 pb-28 sm:pb-32 select-none min-h-[calc(100dvh-4.5rem)]">
      {/* 1. Terminal Top Bar */}
      <header className="flex items-center justify-between py-1.5 border-b border-purple-900/20 shrink-0 gap-2">
        {/* Brand: Logo & Merchant X Title */}
        <div className="flex items-center gap-2 shrink-0">
          <MerchantXLogo size="xs" />
          <span className="font-extrabold text-base sm:text-lg font-display tracking-tight text-white whitespace-nowrap">
            Merchant <span className="text-amber-400">X</span>
          </span>
        </div>

        {/* Right Action: Wallet Status & Connect Button */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={walletState.isConnected ? onOpenWalletModal : handleConnectWalletClick}
            disabled={isOpeningWallet}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate ${
              walletState.isConnected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-[#181a24] border-zinc-700/80 text-zinc-300 hover:text-white hover:border-amber-500/50'
            }`}
          >
            {walletState.isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="font-mono text-[10px] sm:text-[11px] truncate whitespace-nowrap">
              {walletState.isConnected
                ? `Connected ✓ ${connectedDisplayAddress || ''}`
                : isOpeningWallet
                ? 'Opening...'
                : getTranslation(lang, 'connectWallet')}
            </span>
          </button>
        </div>
      </header>

      {/* Wallet Error Notice if any */}
      {walletConnectError && (
        <div className="mt-1 p-2 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{walletConnectError}</span>
          </div>
          <button
            type="button"
            onClick={handleConnectWalletClick}
            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Free Tier Monthly Limit Notice */}
      {!isPro && freeTransactionsRemaining <= 0 && (
        <div className="mt-1.5 p-2.5 bg-gradient-to-r from-amber-500/20 via-purple-950/30 to-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-200 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold truncate">Free limit reached (10/10). Pro required to charge.</span>
          </div>
          {onNavigateToSubscription && (
            <button
              type="button"
              onClick={onNavigateToSubscription}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shrink-0 shadow"
            >
              Upgrade $10
            </button>
          )}
        </div>
      )}

      {!isPro && freeTransactionsRemaining > 0 && freeTransactionsRemaining <= 3 && (
        <div className="mt-1 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between text-[11px] text-zinc-400">
          <span>Free plan: <strong className="text-amber-400">{freeTransactionsRemaining} tx remaining</strong> this month</span>
          {onNavigateToSubscription && (
            <button
              type="button"
              onClick={onNavigateToSubscription}
              className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      )}

      {/* 2. Amount Display Area (Compact & Centered) */}
      <section className="flex flex-col items-center justify-center py-2 sm:py-3 text-center my-auto">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 font-mono">
          {getTranslation(lang, 'enterAmount')}
        </div>

        {/* Large Fiat Amount */}
        <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-white break-all px-2 transition-all">
          {formattedFiatDisplay}
        </div>

        {/* Real Live Market Price & Calculated Payment */}
        <div className="mt-1 space-y-0.5">
          {ratesError ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-400">
              <span>Unable to load current price</span>
              {onRefreshRates && (
                <button
                  type="button"
                  onClick={onRefreshRates}
                  className="underline text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Market Price per Asset */}
              <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                <span>
                  {selectedAsset} market price:{' '}
                  <span className="text-zinc-100 font-mono font-semibold">
                    {formatCryptoMarketPrice(marketPrice, settings.fiatCurrency, selectedAsset)} / {selectedAsset}
                  </span>
                </span>
                {onRefreshRates && (
                  <button
                    type="button"
                    onClick={onRefreshRates}
                    className="inline-flex items-center gap-1 text-[9px] text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Refresh market price"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>{lastRatesUpdated ? new Date(lastRatesUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}</span>
                  </button>
                )}
              </div>

              {/* Calculated Customer Payment Amount */}
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono text-amber-400 font-bold">
                <span>Customer payment amount:</span>
                <span>
                  {formatCryptoAmount(estimatedCryptoAmount, selectedAsset)} {selectedAsset}
                </span>
              </div>
            </>
          )}

          {/* BTC Address Reminder if BTC is selected but no Bitcoin address configured */}
          {selectedAsset === 'BTC' && !walletState.btcAddress && !settings.customBtcReceivingAddress && (
            <div className="mt-1 inline-flex items-center justify-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-300">
              <span>No BTC address configured.</span>
              <button
                type="button"
                onClick={onOpenWalletModal}
                className="font-bold underline text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                Link BTC Address
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Crypto Asset Selection */}
      <section className="my-1 shrink-0">
        <AssetSelector
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
          balances={balances}
          onRefreshBalances={onRefreshBalances}
          isRefreshing={isRefreshingBalances}
          language={lang}
        />
      </section>

      {/* 4. Compact Numeric Keypad & High-Visibility Framed Charge Button */}
      <section className="mt-1.5 shrink-0">
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
