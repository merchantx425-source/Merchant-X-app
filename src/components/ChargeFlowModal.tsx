import React, { useState, useEffect } from 'react';
import { CryptoAsset, FiatCurrency, TransactionRecord } from '../types/merchant';
import { SUPPORTED_ASSETS, SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { verifyBlockchainTransaction, formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { MerchantXLogo } from './MerchantXLogo';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minute payment invoice window
  const [verifiedTx, setVerifiedTx] = useState<TransactionRecord | null>(null);

  const assetConfig = SUPPORTED_ASSETS[cryptoAsset];
  const fiatConfig = SUPPORTED_FIAT[fiatCurrency];

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
  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    }
  };

  // Launch Native Wallet / Payment Protocol URI
  const handleOpenWalletPayment = () => {
    let uri = '';
    if (cryptoAsset === 'BTC') {
      uri = `bitcoin:${merchantWallet}?amount=${amountCrypto}&label=Merchant%20X%20Payment`;
    } else if (cryptoAsset === 'ETH') {
      uri = `ethereum:${merchantWallet}?value=${Math.floor(amountCrypto * 1e18)}`;
    } else if (cryptoAsset === 'POL') {
      uri = `ethereum:${merchantWallet}@137?value=${Math.floor(amountCrypto * 1e18)}`;
    } else if (cryptoAsset === 'USDT') {
      // Polygon USDT ERC20 Transfer URI
      uri = `ethereum:${assetConfig.contractAddress}@137/transfer?address=${merchantWallet}&uint256=${Math.floor(
        amountCrypto * 1e6
      )}`;
    } else if (cryptoAsset === 'VERSE') {
      uri = `ethereum:${assetConfig.contractAddress}@137/transfer?address=${merchantWallet}&uint256=${Math.floor(
        amountCrypto * 1e18
      )}`;
    }

    if (uri && typeof window !== 'undefined') {
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
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#3B82F6', '#10B981', '#ffffff'],
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
      <div className="relative w-full max-w-lg bg-[#111319] border border-purple-900/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <MerchantXLogo size="sm" />
            <div>
              <h2 className="text-base font-bold font-display text-white tracking-tight">Merchant X Terminal</h2>
              <p className="text-[11px] text-zinc-400">Payment Invoice & Blockchain Settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Awaiting Payment */}
        {step === 'awaiting_payment' && (
          <div className="space-y-4 py-4">
            {/* Payment Summary Box */}
            <div className="bg-[#181a23] border border-zinc-700/60 rounded-2xl p-4 text-center relative overflow-hidden">
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                {getTranslation(language, 'totalDue')}
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white mt-1">
                {formattedFiat}
              </div>
              <div className="text-sm font-mono text-amber-400 font-bold mt-1">
                ≈ {formattedCrypto}
              </div>

              {/* Countdown badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 mt-3 font-mono">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{getTranslation(language, 'expiresIn')} {formattedTimeLeft}</span>
              </div>
            </div>

            {/* Merchant Receiving Address Details */}
            <div className="space-y-2.5">
              <div className="p-3 bg-[#0d0e14] border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Network:</span>
                  <span className="font-semibold text-white">{assetConfig.network}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{getTranslation(language, 'paymentAsset')}:</span>
                  <span className="font-semibold text-amber-400">{cryptoAsset} ({assetConfig.name})</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/70">
                  <span className="text-zinc-400">{getTranslation(language, 'merchantWallet')}:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(merchantWallet)}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-mono text-[11px] cursor-pointer"
                  >
                    <span>{formatAddress(merchantWallet, 5)}</span>
                    {copiedAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Full merchant wallet address text */}
              <div className="p-2.5 bg-[#090a0e] rounded-lg border border-zinc-800/60 font-mono text-[11px] text-zinc-300 break-all select-all flex items-center justify-between">
                <span>{merchantWallet}</span>
              </div>
            </div>

            {/* Launch Supported Wallet Application */}
            <button
              type="button"
              onClick={handleOpenWalletPayment}
              className="w-full py-3.5 bg-[#1f2230] hover:bg-[#272b3c] border border-amber-500/40 hover:border-amber-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow-md"
            >
              <Wallet className="w-4 h-4" />
              <span>{getTranslation(language, 'launchWallet')}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            {/* Transaction Hash Verification Input */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Verify Submitted Transaction Hash:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={txHashInput}
                  onChange={(e) => {
                    setTxHashInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Paste on-chain 0x... or BTC txid"
                  className="flex-1 bg-[#090a0e] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyTransaction()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  {getTranslation(language, 'verifyOnChain')}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Verifying On-Chain */}
        {step === 'verifying' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white">
                {getTranslation(language, 'verifyingSettlement')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Confirming cryptographic signature, amount, recipient address, and block status on{' '}
                <span className="text-amber-400 font-semibold">{assetConfig.network}</span>...
              </p>
            </div>
            <div className="font-mono text-xs text-zinc-500 break-all max-w-sm px-4 py-2 bg-zinc-900/60 rounded-lg">
              TX: {formatAddress(txHashInput, 10)}
            </div>
          </div>
        )}

        {/* STEP 3: Payment Approved */}
        {step === 'approved' && verifiedTx && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                {getTranslation(language, 'paymentApproved')}
              </div>
              <h3 className="text-2xl font-extrabold font-display text-white mt-1">
                {formattedFiat}
              </h3>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                {formattedCrypto} • {verifiedTx.network}
              </div>
            </div>

            {/* Transaction Verification Details */}
            <div className="w-full bg-[#0d0e14] border border-emerald-900/40 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'reference')}:</span>
                <span className="font-mono font-semibold text-white">{verifiedTx.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'status')}:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {getTranslation(language, 'paid')} ✓
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'merchantWallet')}:</span>
                <span className="font-mono text-zinc-300">{formatAddress(verifiedTx.merchantWallet, 5)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'customerWallet')}:</span>
                <span className="font-mono text-zinc-300">{formatAddress(verifiedTx.customerWallet || 'Verified On-Chain', 5)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Block Number:</span>
                <span className="font-mono text-zinc-300">{verifiedTx.blockNumber || 'Confirmed'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'date')} & {getTranslation(language, 'time')}:</span>
                <span className="text-zinc-300">{verifiedTx.formattedDate} {verifiedTx.formattedTime}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'txHash')}:</span>
                <a
                  href={`${EXPLORER_URLS[verifiedTx.network]}/tx/${verifiedTx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                >
                  <span>{formatAddress(verifiedTx.txHash, 6)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-black font-bold text-sm rounded-xl transition-all shadow-lg cursor-pointer"
            >
              Done & View Receipt
            </button>
          </div>
        )}

        {/* STEP 4: Failed */}
        {step === 'failed' && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/60 flex items-center justify-center text-red-400">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-red-400 font-bold">
                VERIFICATION FAILED
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Payment could not be verified</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {errorMsg || 'The transaction was not confirmed or could not be found on the selected network.'}
              </p>
            </div>

            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setStep('awaiting_payment')}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Back to Terminal
              </button>
              <button
                type="button"
                onClick={() => handleVerifyTransaction()}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
