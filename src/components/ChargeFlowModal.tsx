import React, { useState, useEffect } from 'react';
import { CryptoAsset, FiatCurrency, TransactionRecord } from '../types/merchant';
import { SUPPORTED_ASSETS, SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { verifyBlockchainTransaction, formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ArrowUpRight,
  Wallet,
  Smartphone,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChargeFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountFiat: number;
  fiatCurrency: FiatCurrency;
  amountCrypto: number;
  cryptoAsset: CryptoAsset;
  cryptoRate: number;
  merchantWallet: string;
  onPaymentSuccess: (txRecord: TransactionRecord) => void;
  language?: string;
}

type FlowStep = 'awaiting_payment' | 'verifying' | 'approved' | 'failed';

export const ChargeFlowModal: React.FC<ChargeFlowModalProps> = ({
  isOpen,
  onClose,
  amountFiat,
  fiatCurrency,
  amountCrypto,
  cryptoAsset,
  cryptoRate,
  merchantWallet,
  onPaymentSuccess,
  language = 'en',
}) => {
  const [step, setStep] = useState<FlowStep>('awaiting_payment');
  const [txHashInput, setTxHashInput] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minute payment invoice window
  const [, setVerifiedTx] = useState<TransactionRecord | null>(null);

  const assetConfig = SUPPORTED_ASSETS[cryptoAsset];
  const fiatConfig = SUPPORTED_FIAT[fiatCurrency];

  // Build Bitcoin.com Wallet specific receive deep link URI
  const getBitcoinDotComUri = () => {
    const coinSymbol = cryptoAsset === 'POL' ? 'MATIC' : cryptoAsset;
    return `bitcoincom://receive?coin=${coinSymbol}&address=${encodeURIComponent(
      merchantWallet
    )}&amount=${amountCrypto}&reference=MerchantX`;
  };

  // Build Standard Universal Web3 Crypto URI
  const getStandardCryptoUri = () => {
    if (cryptoAsset === 'BTC') {
      return `bitcoin:${merchantWallet}?amount=${amountCrypto}&label=Merchant%20X%20Payment`;
    }
    if (cryptoAsset === 'ETH') {
      return `ethereum:${merchantWallet}?value=${Math.floor(amountCrypto * 1e18)}`;
    }
    if (cryptoAsset === 'POL') {
      return `ethereum:${merchantWallet}@137?value=${Math.floor(amountCrypto * 1e18)}`;
    }
    if (cryptoAsset === 'USDT') {
      // Polygon USDT ERC20 Transfer URI
      return `ethereum:${assetConfig.contractAddress}@137/transfer?address=${merchantWallet}&uint256=${Math.floor(
        amountCrypto * 1e6
      )}`;
    }
    if (cryptoAsset === 'VERSE') {
      // Polygon Verse ERC20 Transfer URI
      return `ethereum:${assetConfig.contractAddress}@137/transfer?address=${merchantWallet}&uint256=${Math.floor(
        amountCrypto * 1e18
      )}`;
    }
    return `ethereum:${merchantWallet}`;
  };

  // Automatically attempt opening Bitcoin.com Wallet app / Web3 wallet receive screen when Charge opens
  useEffect(() => {
    if (isOpen && step === 'awaiting_payment') {
      const bitcoinComUri = getBitcoinDotComUri();
      try {
        window.location.href = bitcoinComUri;
      } catch {
        // Handled gracefully in UI
      }
    }
  }, [isOpen, cryptoAsset]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || step === 'approved') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const formattedFiat = `${fiatConfig.symbol}${amountFiat.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedCrypto = `${formatCryptoAmount(amountCrypto, cryptoAsset)} ${cryptoAsset}`;

  // Copy helpers
  const handleCopy = (text: string, type: 'addr' | 'amount') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'addr') {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      } else {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      }
    }
  };

  // Launch Bitcoin.com Wallet directly
  const handleOpenBitcoinDotComWallet = () => {
    const uri = getBitcoinDotComUri();
    if (typeof window !== 'undefined') {
      window.location.href = uri;
    }
  };

  // Launch Standard Web3 Wallet
  const handleOpenStandardWallet = () => {
    const uri = getStandardCryptoUri();
    if (typeof window !== 'undefined') {
      window.location.href = uri;
    }
  };

  // Run On-chain Blockchain Verification
  const handleVerifyTransaction = async (hashToVerify?: string) => {
    const hash = (hashToVerify || txHashInput).trim();
    if (!hash) {
      setErrorMsg('Please enter or provide the transaction hash to verify on-chain.');
      return;
    }

    setStep('verifying');
    setErrorMsg(null);

    try {
      const result = await verifyBlockchainTransaction({
        txHash: hash,
        expectedAsset: cryptoAsset,
        expectedAmountCrypto: amountCrypto,
        merchantWallet,
      });

      if (result.isVerified) {
        // Build confirmed Transaction Record
        const now = new Date();
        const txRecord: TransactionRecord = {
          id: `TX-${Date.now().toString(36).toUpperCase()}`,
          reference: `MX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          amountFiat,
          fiatCurrency,
          amountCrypto: result.actualAmount || amountCrypto,
          cryptoAsset,
          network: assetConfig.network,
          cryptoRate,
          merchantWallet,
          customerWallet: result.customerAddress,
          txHash: hash,
          status: 'paid',
          timestamp: result.timestamp || Date.now(),
          formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          formattedTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          blockNumber: result.blockNumber,
        };

        setVerifiedTx(txRecord);
        setStep('approved');

        // Confetti celebration
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#00D2FF', '#8A2BE2', '#10B981', '#ffffff'],
          });
        } catch {
          // Ignore
        }

        onPaymentSuccess(txRecord);
      } else {
        setStep('failed');
        setErrorMsg(result.errorMessage || 'Transaction could not be verified on the blockchain.');
      }
    } catch (err: any) {
      setStep('failed');
      setErrorMsg(err.message || 'Verification failed. Please check network connectivity.');
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTimeLeft = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111319] border border-purple-900/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <CryptoAssetIcon asset={cryptoAsset} size="md" />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base font-display tracking-tight text-white flex items-center gap-1.5">
                {cryptoAsset} Payment Flow
              </span>
              <span className="text-[10px] text-zinc-400">
                {assetConfig.network} Network • Non-Custodial
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Flow States */}
        {step === 'awaiting_payment' && (
          <div className="py-4 space-y-4">
            {/* Amount Banner */}
            <div className="bg-[#181a24] border border-zinc-800/80 rounded-2xl p-4 text-center">
              <div className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-0.5">
                {getTranslation(language, 'enterAmount')}
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white">
                {formattedFiat}
              </div>
              <div className="flex items-center justify-center gap-1 text-sm sm:text-base font-mono font-bold text-amber-400 mt-1">
                <span>{formattedCrypto}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(amountCrypto.toString(), 'amount')}
                  className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                  title="Copy exact crypto amount"
                >
                  {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Bitcoin.com Wallet Direct Action Box */}
            <div className="p-4 bg-gradient-to-b from-[#0a1924] to-[#121824] border border-cyan-800/50 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Bitcoin.com Wallet Native Receive</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                  <Clock className="w-3 h-3" />
                  <span>{formattedTimeLeft}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Tap below to launch the <strong className="text-white">Bitcoin.com Wallet</strong> app directly to the{' '}
                <strong className="text-cyan-400">RECEIVE</strong> screen for{' '}
                <strong className="text-amber-400">{cryptoAsset}</strong>. The wallet will display its native QR code for the customer to scan and pay.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenBitcoinDotComWallet}
                  className="w-full py-3 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Open Bitcoin.com Receive</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStandardWallet}
                  className="w-full py-3 px-3 bg-[#1e2330] hover:bg-[#282e40] border border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-amber-400" />
                  <span>Open Web3 Wallet</span>
                </button>
              </div>
            </div>

            {/* Merchant Receiving Address Row */}
            <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{getTranslation(language, 'merchantWallet')} ({cryptoAsset}):</span>
                <span className="text-[10px] text-zinc-500 font-mono">{assetConfig.network}</span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 bg-[#0c0d12] rounded-xl border border-zinc-800">
                <span className="font-mono text-xs text-zinc-200 truncate select-all">
                  {merchantWallet}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(merchantWallet, 'addr')}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Blockchain Transaction Verification Input */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {getTranslation(language, 'verifyPayment')}:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  placeholder="Paste on-chain Tx Hash (0x... or BTC hash)"
                  className="flex-1 px-3 py-2.5 bg-[#14161f] border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyTransaction()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  {getTranslation(language, 'verifyPayment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verification in Progress */}
        {step === 'verifying' && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-white">
                {getTranslation(language, 'verifyingOnChain')}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Querying {assetConfig.network} node for block confirmation, recipient address match, and transfer amount...
              </p>
            </div>
          </div>
        )}

        {/* Approved State */}
        {step === 'approved' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold tracking-wider uppercase rounded-full">
                {getTranslation(language, 'paymentApproved')}
              </span>
              <div className="text-3xl font-extrabold font-display text-white mt-2">
                {formattedFiat}
              </div>
              <div className="text-xs font-mono font-bold text-amber-400">
                {formattedCrypto}
              </div>
            </div>

            <div className="w-full p-3 bg-[#161822] border border-zinc-800 rounded-xl text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-zinc-400">
                <span>{getTranslation(language, 'status')}:</span>
                <span className="font-semibold text-emerald-400">Settled On-Chain ✓</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Network:</span>
                <span className="font-mono text-zinc-200">{assetConfig.network}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>{getTranslation(language, 'txHash')}:</span>
                <a
                  href={`${EXPLORER_URLS[assetConfig.network]}/tx/${txHashInput}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                >
                  <span>{formatAddress(txHashInput, 4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {step === 'failed' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-display text-white">
                Payment Verification Failed
              </h3>
              <p className="text-xs text-red-300 max-w-xs">{errorMsg}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('awaiting_payment')}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleVerifyTransaction()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Retry Verification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
