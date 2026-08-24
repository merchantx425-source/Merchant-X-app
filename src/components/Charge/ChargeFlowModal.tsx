import React, { useState, useEffect } from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { TransactionRecord, CryptoAsset } from '../../types/merchant';
import { SUPPORTED_ASSETS, SUPPORTED_FIAT, EXPLORER_URLS } from '../../config/constants';
import { formatAddress, formatCryptoAmount, verifyBlockchainTransaction } from '../../services/blockchainService';
import { MerchantXLogo } from '../MerchantXLogo';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Wallet,
  Clock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChargeFlowModalProps {
  onClose: () => void;
  onPaymentSuccess: (tx: TransactionRecord) => void;
}

export const ChargeFlowModal: React.FC<ChargeFlowModalProps> = ({
  onClose,
  onPaymentSuccess,
}) => {
  const {
    activeCharge,
    updateTransaction,
    wallet,
    settings,
    addTransaction,
    setActiveReceipt,
    refreshBalances,
  } = useMerchant();

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<TransactionRecord | null>(null);
  const [activeStep, setActiveStep] = useState<'awaiting_wallet' | 'verifying' | 'approved' | 'failed'>('awaiting_wallet');
  const [walletLaunchError, setWalletLaunchError] = useState<string | null>(null);

  if (!activeCharge) return null;

  const fiatConfig = SUPPORTED_FIAT[activeCharge.fiatCurrency] || SUPPORTED_FIAT.NGN;
  const assetConfig = SUPPORTED_ASSETS[activeCharge.cryptoAsset];
  const explorerUrl = EXPLORER_URLS[activeCharge.network];

  // Standard payment protocol URIs (EIP-681 for Ethereum/Polygon, BIP-21 for Bitcoin)
  const getPaymentUri = () => {
    if (activeCharge.network === 'Bitcoin') {
      return `bitcoin:${activeCharge.merchantWallet}?amount=${activeCharge.amountCrypto}&label=MerchantX_${activeCharge.reference}`;
    }
    if (activeCharge.cryptoAsset === 'ETH' || activeCharge.cryptoAsset === 'POL') {
      return `ethereum:${activeCharge.merchantWallet}?value=${activeCharge.amountCrypto * 1e18}`;
    }
    // Token transfer
    if (assetConfig.contractAddress) {
      return `ethereum:${assetConfig.contractAddress}/transfer?address=${activeCharge.merchantWallet}&uint256=${activeCharge.amountCrypto}`;
    }
    return `ethereum:${activeCharge.merchantWallet}`;
  };

  const paymentUri = getPaymentUri();

  // Launch customer wallet application / web3 provider
  const handleOpenInWallet = async () => {
    setWalletLaunchError(null);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum && activeCharge.network !== 'Bitcoin') {
        const eth = (window as any).ethereum;
        // Request transaction directly from connected customer wallet
        setIsVerifying(true);
        setActiveStep('verifying');

        let txHash = '';
        if (activeCharge.cryptoAsset === 'ETH' || activeCharge.cryptoAsset === 'POL') {
          // Native transfer
          const valueWei = '0x' + BigInt(Math.round(activeCharge.amountCrypto * 1e18)).toString(16);
          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: wallet.evmAddress || undefined,
                to: activeCharge.merchantWallet,
                value: valueWei,
              },
            ],
          });
        } else if (assetConfig.contractAddress) {
          // ERC20 Transfer call data
          const transferSignature = '0xa9059cbb';
          const paddedAddress = activeCharge.merchantWallet.toLowerCase().replace('0x', '').padStart(64, '0');
          const tokenDecimals = assetConfig.decimals;
          const tokenAmountRaw = BigInt(Math.round(activeCharge.amountCrypto * Math.pow(10, tokenDecimals)));
          const paddedAmount = tokenAmountRaw.toString(16).padStart(64, '0');
          const data = transferSignature + paddedAddress + paddedAmount;

          txHash = await eth.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: wallet.evmAddress || undefined,
                to: assetConfig.contractAddress,
                data: data,
                value: '0x0',
              },
            ],
          });
        }

        if (txHash) {
          setTxHashInput(txHash);
          await performVerification(txHash);
        }
      } else {
        // Fallback: Open protocol URI for external wallet apps (Trust Wallet, Rainbow, MetaMask Mobile, Bitcoin.com)
        window.location.href = paymentUri;
      }
    } catch (err: any) {
      console.warn('Wallet launch notice:', err);
      setIsVerifying(false);
      setActiveStep('awaiting_wallet');
      if (err.code === 4001) {
        setWalletLaunchError('Transaction was cancelled in the wallet.');
      } else {
        setWalletLaunchError(
          'Wallet app launched via deep link. After payment completion, enter or verify the transaction hash below.'
        );
      }
    }
  };

  // Perform rigorous on-chain verification
  const performVerification = async (hashToVerify?: string) => {
    const hash = (hashToVerify || txHashInput).trim();
    if (!hash) {
      setVerificationError('Please provide a valid transaction hash to verify on-chain.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setActiveStep('verifying');

    try {
      const result = await verifyBlockchainTransaction({
        txHash: hash,
        expectedAsset: activeCharge.cryptoAsset,
        expectedAmountCrypto: activeCharge.amountCrypto,
        merchantWallet: activeCharge.merchantWallet,
      });

      if (!result.isVerified) {
        setVerificationError(result.errorMessage || 'Payment could not be verified on the blockchain.');
        setActiveStep('failed');
        setIsVerifying(false);
        return;
      }

      // Verified successfully!
      const approvedTx: TransactionRecord = {
        ...activeCharge,
        status: 'paid',
        txHash: hash,
        blockNumber: result.blockNumber,
        customerWallet: result.customerAddress,
        timestamp: result.timestamp || Date.now(),
      };

      setVerificationSuccess(approvedTx);
      setActiveStep('approved');
      setIsVerifying(false);

      // Save to transaction history
      addTransaction(approvedTx);
      refreshBalances();

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff7a00', '#ffd700', '#3b82f6', '#10b981'],
        });
      } catch {}

      // Open receipt after a brief moment
      setTimeout(() => {
        onPaymentSuccess(approvedTx);
      }, 1400);
    } catch (err: any) {
      setIsVerifying(false);
      setActiveStep('failed');
      setVerificationError(err?.message || 'Payment could not be verified.');
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(activeCharge.merchantWallet);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const copyUri = () => {
    navigator.clipboard.writeText(paymentUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0e1017] border border-slate-800/90 rounded-3xl p-5 shadow-2xl text-white my-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2">
            <MerchantXLogo size="sm" />
            <div>
              <h3 className="font-['Outfit'] font-bold text-sm text-white">
                Payment Terminal
              </h3>
              <p className="text-[10px] text-slate-400 font-['JetBrains_Mono']">
                Ref: {activeCharge.reference}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status indicator banner */}
        <div className="my-4">
          {activeStep === 'approved' ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-300 font-['Outfit'] uppercase tracking-wider block">
                  PAYMENT APPROVED ✓
                </span>
                <span className="text-[11px] text-slate-300">
                  On-chain blockchain transaction verified successfully.
                </span>
              </div>
            </div>
          ) : activeStep === 'verifying' ? (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin shrink-0" />
              <div>
                <span className="text-xs font-bold text-blue-300 font-['Outfit'] uppercase tracking-wider block">
                  Verifying Blockchain Transaction...
                </span>
                <span className="text-[11px] text-slate-400">
                  Querying {activeCharge.network} network nodes for receipt and block confirmation.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-300 font-['Outfit'] uppercase tracking-wider block">
                  Awaiting Customer Payment
                </span>
                <span className="text-[11px] text-slate-400">
                  Present this checkout to customer to complete transfer.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Charge Details Card */}
        <div className="bg-[#141722] border border-slate-800/80 rounded-2xl p-4 mb-4">
          <div className="text-center pb-3 border-b border-slate-800/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Amount Due
            </span>
            <div className="text-3xl font-extrabold text-white font-['Outfit'] mt-1">
              {fiatConfig.symbol}
              {activeCharge.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: assetConfig.iconColor }}
              />
              <span className="text-sm font-bold text-amber-400 font-['JetBrains_Mono']">
                {formatCryptoAmount(activeCharge.amountCrypto, activeCharge.cryptoAsset)}{' '}
                {activeCharge.cryptoAsset}
              </span>
              <span className="text-[11px] text-slate-400">
                ({activeCharge.network})
              </span>
            </div>
          </div>

          {/* Payment metadata rows */}
          <div className="space-y-2 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Receiving Wallet:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-['JetBrains_Mono'] text-slate-200 font-medium">
                  {formatAddress(activeCharge.merchantWallet, 6)}
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="p-1 text-slate-400 hover:text-white rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
                  title="Copy full receiving address"
                >
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Exchange Rate:</span>
              <span className="font-['JetBrains_Mono'] text-slate-300">
                1 {activeCharge.cryptoAsset} ≈ {fiatConfig.symbol}
                {activeCharge.cryptoRate.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Network:</span>
              <span className="text-slate-300 font-medium">{activeCharge.network}</span>
            </div>
          </div>
        </div>

        {/* Notice on Rule 10: Wallet Handles QR / Payment Flow */}
        <div className="p-3 mb-4 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-300 font-semibold block">
              Native Wallet Payment Handshake
            </span>
            <span>
              The customer wallet application handles the payment transfer, scanning, and signature natively.
            </span>
          </div>
        </div>

        {walletLaunchError && (
          <div className="p-2.5 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{walletLaunchError}</span>
          </div>
        )}

        {/* Primary Action: Open Wallet / Trigger Web3 Transfer */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleOpenInWallet}
            disabled={isVerifying || activeStep === 'approved'}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#ff6b00] to-[#ffa000] text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            <span>Open in Customer Wallet / Pay Now</span>
          </button>

          <button
            type="button"
            onClick={copyUri}
            className="w-full h-11 rounded-xl bg-[#181b25] hover:bg-[#202534] border border-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUri ? 'Payment URI Copied' : 'Copy Payment Protocol URI (EIP-681 / BIP-21)'}</span>
          </button>
        </div>

        {/* Blockchain Verification Section */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-300 font-['Outfit'] uppercase tracking-wider block mb-1.5">
            Verify Blockchain Settlement
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste transaction hash (0x... or txid)"
              value={txHashInput}
              onChange={(e) => setTxHashInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#12141c] border border-slate-800 rounded-xl text-xs font-['JetBrains_Mono'] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => performVerification()}
              disabled={isVerifying || !txHashInput.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Verify</span>
            </button>
          </div>

          {verificationError && (
            <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verificationError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
