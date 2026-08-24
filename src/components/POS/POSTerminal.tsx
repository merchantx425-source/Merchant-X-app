import React, { useState, useMemo } from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { SUPPORTED_FIAT, SUPPORTED_ASSETS } from '../../config/constants';
import { formatCryptoAmount } from '../../services/blockchainService';
import { MerchantXLogo } from '../MerchantXLogo';
import { AssetSelector } from './AssetSelector';
import { BalanceDisplay } from './BalanceDisplay';
import { NumericKeypad } from './NumericKeypad';
import { ChargeButton } from './ChargeButton';
import { WalletConnectModal } from '../Wallet/WalletConnectModal';
import { ChargeFlowModal } from '../Charge/ChargeFlowModal';
import { ReceiptModal } from '../Receipt/ReceiptModal';
import { TransactionRecord } from '../../types/merchant';
import {
  Settings as SettingsIcon,
  Wallet,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const POSTerminal: React.FC = () => {
  const {
    settings,
    selectedAsset,
    rates,
    wallet,
    activeCharge,
    setActiveCharge,
    activeReceipt,
    setActiveReceipt,
    setCurrentTab,
  } = useMerchant();

  const [rawAmount, setRawAmount] = useState<string>('');
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  const fiatConfig = SUPPORTED_FIAT[settings.fiatCurrency] || SUPPORTED_FIAT.NGN;
  const assetConfig = SUPPORTED_ASSETS[selectedAsset];

  // Parse numeric amount
  const numericAmount = useMemo(() => {
    if (!rawAmount || rawAmount === '.') return 0;
    const parsed = parseFloat(rawAmount);
    return isNaN(parsed) ? 0 : parsed;
  }, [rawAmount]);

  // Format amount for display (e.g. "50,000" or "50,000.50")
  const formattedDisplayAmount = useMemo(() => {
    if (!rawAmount) return '0';
    if (rawAmount.includes('.')) {
      const [integerPart, decimalPart] = rawAmount.split('.');
      const formattedInt = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : '0';
      return `${formattedInt}.${decimalPart}`;
    }
    const parsed = parseInt(rawAmount, 10);
    return isNaN(parsed) ? '0' : parsed.toLocaleString('en-US');
  }, [rawAmount]);

  // Calculate live crypto conversion preview
  const cryptoEquivalent = useMemo(() => {
    if (numericAmount <= 0) return 0;
    const fiatPerCrypto = rates.cryptoInFiat[selectedAsset] || 1;
    return numericAmount / fiatPerCrypto;
  }, [numericAmount, selectedAsset, rates.cryptoInFiat]);

  // Handle Charge initiation
  const handleInitiateCharge = () => {
    if (numericAmount <= 0) return;

    // Resolve merchant receiving address (wallet or manual configured address)
    const merchantAddr =
      assetConfig.networkFamily === 'bitcoin'
        ? wallet.btcAddress || settings.customBtcReceivingAddress || 'bc1qmerchantxposdefaultsettlement89xy'
        : wallet.evmAddress || settings.customEvmReceivingAddress || '0x71C5A8c93F1c7C2263C53696803277C18858A89B';

    const now = new Date();
    const reference = `MX-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const chargeSession: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      reference,
      amountFiat: numericAmount,
      fiatCurrency: settings.fiatCurrency,
      amountCrypto: cryptoEquivalent,
      cryptoAsset: selectedAsset,
      network: assetConfig.network,
      cryptoRate: rates.cryptoInFiat[selectedAsset] || 1,
      merchantWallet: merchantAddr,
      status: 'pending',
      timestamp: Date.now(),
      formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      formattedTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveCharge(chargeSession);
  };

  const handlePaymentSuccess = (tx: TransactionRecord) => {
    setActiveCharge(null);
    setRawAmount('');
    setActiveReceipt(tx);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-2 pb-24 text-white flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between py-2 mb-2">
        <div className="flex items-center gap-2.5">
          <MerchantXLogo size="sm" />
          <div className="flex flex-col">
            <span className="font-['Outfit'] font-extrabold text-base tracking-tight text-white leading-none">
              Merchant <span className="text-amber-400">X</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              {settings.merchantName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Wallet Status button */}
          <button
            type="button"
            onClick={() => setShowWalletModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#141620] hover:bg-[#1c1f2e] border border-slate-800 transition-colors cursor-pointer text-xs font-semibold text-slate-300"
            title="Wallet Connection"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wallet.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Settings shortcut */}
          <button
            type="button"
            onClick={() => setCurrentTab('settings')}
            className="p-1.5 rounded-xl bg-[#141620] hover:bg-[#1c1f2e] border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Open Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col justify-center my-auto">
        {/* Large Centered Amount Display */}
        <div className="text-center my-3 py-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Enter Charge Amount
          </span>

          <div className="inline-flex items-baseline justify-center max-w-full px-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-['Outfit'] mr-1 select-none">
              {fiatConfig.symbol}
            </span>
            <span className="text-4xl sm:text-5xl md:text-6xl font-black text-white font-['JetBrains_Mono'] tracking-tight select-all truncate">
              {formattedDisplayAmount}
            </span>
          </div>

          {/* Live Crypto Conversion Ticker */}
          <div className="mt-2 min-h-[22px] flex items-center justify-center">
            {numericAmount > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-amber-300 font-['JetBrains_Mono'] shadow-sm">
                <span>≈ {formatCryptoAmount(cryptoEquivalent, selectedAsset)}</span>
                <span className="text-white">{selectedAsset}</span>
                <span className="text-slate-500 text-[10px]">({assetConfig.network})</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                1 {selectedAsset} ≈ {fiatConfig.symbol}
                {(rates.cryptoInFiat[selectedAsset] || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>

        {/* Real Balance & Wallet Banner */}
        <BalanceDisplay onOpenWalletModal={() => setShowWalletModal(true)} />

        {/* Crypto Payment Asset Selection */}
        <AssetSelector enteredFiatAmount={numericAmount} />

        {/* Numeric Keypad */}
        <NumericKeypad
          rawAmount={rawAmount}
          onAmountChange={setRawAmount}
          onClear={() => setRawAmount('')}
        />

        {/* Large Primary Charge Action Button */}
        <ChargeButton
          amount={numericAmount}
          formattedAmountString={formattedDisplayAmount}
          fiatCurrency={settings.fiatCurrency}
          onCharge={handleInitiateCharge}
        />
      </div>

      {/* Modals */}
      {showWalletModal && (
        <WalletConnectModal onClose={() => setShowWalletModal(false)} />
      )}

      {activeCharge && (
        <ChargeFlowModal
          onClose={() => setActiveCharge(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
