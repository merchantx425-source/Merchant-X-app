import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import {
  CryptoAsset,
  SubscriptionRecord,
  WalletState,
} from '../types/merchant';
import {
  SUPPORTED_ASSETS,
  PRO_RECEIVING_ADDRESS,
  PRO_PRICE_USD,
  PRO_SUBSCRIPTION_MS,
  EXPLORER_URLS,
  ERC20_ABI,
} from '../config/constants';
import {
  verifyBlockchainTransaction,
  scanForIncomingPayment,
  formatCryptoAmount,
  formatAddress,
} from '../services/blockchainService';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
  Wallet,
  Zap,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  onOpenWalletModal: () => void;
  cryptoRatesUsd: Record<CryptoAsset, number>;
  onSubscriptionSuccess: (record: SubscriptionRecord) => void;
  isRenewing?: boolean;
}

type ModalStep = 'select_asset' | 'awaiting_payment' | 'verifying' | 'success' | 'failed';

const PAYMENT_ASSETS: CryptoAsset[] = ['USDT', 'POL', 'VERSE', 'ETH'];

export const ProPaymentModal: React.FC<ProPaymentModalProps> = ({
  isOpen,
  onClose,
  walletState,
  onOpenWalletModal,
  cryptoRatesUsd,
  onSubscriptionSuccess,
  isRenewing = false,
}) => {
  const [step, setStep] = useState<ModalStep>('select_asset');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('USDT');
  const [txHashInput, setTxHashInput] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningWallet, setIsSigningWallet] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [confirmedTxRecord, setConfirmedTxRecord] = useState<SubscriptionRecord | null>(null);
  const [paymentMode, setPaymentMode] = useState<'wallet' | 'qr'>('wallet');

  const assetConfig = SUPPORTED_ASSETS[selectedAsset];
  const isApprovedRef = useRef(false);
  const isScanInFlightRef = useRef(false);

  // Calculate required crypto amount for $10 USD
  const assetUsdRate = cryptoRatesUsd[selectedAsset] || (selectedAsset === 'USDT' ? 1 : 0.45);
  const requiredCryptoAmount = assetUsdRate > 0 ? PRO_PRICE_USD / assetUsdRate : 10;

  // Format precise crypto decimal string with no scientific notation
  const getCleanAmountString = (amount: number, maxDecimals = 6) => {
    return amount.toLocaleString('fullwide', {
      useGrouping: false,
      maximumFractionDigits: maxDecimals,
    });
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_asset');
      setTxHashInput('');
      setErrorMsg(null);
      setIsSigningWallet(false);
      setIsScanning(false);
      setSessionStartTime(Date.now());
      setConfirmedTxRecord(null);
      isApprovedRef.current = false;
      isScanInFlightRef.current = false;
    }
  }, [isOpen]);

  // Copy helpers
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(PRO_RECEIVING_ADDRESS);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(getCleanAmountString(requiredCryptoAmount, 6));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#FFFFFF'],
      });
    } catch {
      // Confetti fallback
    }
  };

  // Finalize Subscription Confirmation
  const handleFinalizeSubscription = (
    txHash: string,
    senderAddr: string,
    actualAmount: number
  ) => {
    if (isApprovedRef.current) return;
    isApprovedRef.current = true;

    const now = Date.now();
    const newRecord: SubscriptionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      plan: 'pro',
      amountUsd: PRO_PRICE_USD,
      cryptoAsset: selectedAsset,
      cryptoAmount: actualAmount || requiredCryptoAmount,
      cryptoRateUsd: assetUsdRate,
      txHash,
      network: assetConfig.network,
      timestamp: now,
      formattedDate: new Date(now).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      formattedTime: new Date(now).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'confirmed',
      senderWallet: senderAddr || walletState.evmAddress || 'Connected Wallet',
      receivingWallet: PRO_RECEIVING_ADDRESS,
      periodStartTimestamp: now,
      periodEndTimestamp: now + PRO_SUBSCRIPTION_MS,
    };

    setConfirmedTxRecord(newRecord);
    setStep('success');
    triggerConfetti();
    onSubscriptionSuccess(newRecord);
  };

  // 1. Direct Web3 Signing Payment via Connected Wallet
  const handleSignAndPay = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setErrorMsg('No browser Web3 wallet found. Please scan the QR code with your mobile wallet app.');
      setPaymentMode('qr');
      return;
    }

    setIsSigningWallet(true);
    setErrorMsg(null);

    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('Wallet connection cancelled by user.');
      }

      const signer = await browserProvider.getSigner();
      const customerAddr = await signer.getAddress();

      // Check and switch network if necessary
      const isPolygonAsset = selectedAsset === 'POL' || selectedAsset === 'VERSE' || selectedAsset === 'USDT';
      const targetChainIdHex = isPolygonAsset ? '0x89' : '0x1'; // 137 Polygon or 1 Ethereum

      const currentNetwork = await browserProvider.getNetwork();
      const currentChainId = Number(currentNetwork.chainId);

      if (isPolygonAsset && currentChainId !== 137) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainIdHex }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x89',
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                  rpcUrls: ['https://polygon-rpc.com/'],
                  blockExplorerUrls: ['https://polygonscan.com/'],
                },
              ],
            });
          } else {
            throw new Error('Please switch your wallet to Polygon network to continue.');
          }
        }
      }

      let txHash = '';

      // A. Native POL or ETH Transfer
      if (!assetConfig.contractAddress) {
        const cleanAmount = getCleanAmountString(requiredCryptoAmount, 18);
        const parsedValue = ethers.parseEther(cleanAmount);

        const tx = await signer.sendTransaction({
          to: PRO_RECEIVING_ADDRESS,
          value: parsedValue,
        });

        setStep('verifying');
        txHash = tx.hash;
        setTxHashInput(tx.hash);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);
        if (!receipt || receipt.status !== 1) {
          throw new Error('Transaction was reverted or failed on-chain.');
        }
      } else {
        // B. ERC20 Transfer (USDT or VERSE)
        const tokenContract = new ethers.Contract(assetConfig.contractAddress, ERC20_ABI, signer);
        const cleanAmount = getCleanAmountString(requiredCryptoAmount, assetConfig.decimals);
        const rawUnits = ethers.parseUnits(cleanAmount, assetConfig.decimals);

        const tx = await tokenContract.transfer(PRO_RECEIVING_ADDRESS, rawUnits);

        setStep('verifying');
        txHash = tx.hash;
        setTxHashInput(tx.hash);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);
        if (!receipt || receipt.status !== 1) {
          throw new Error('Token transfer failed or was reverted on-chain.');
        }
      }

      // Verify on-chain with our strict verification engine
      const verification = await verifyBlockchainTransaction({
        txHash,
        expectedAsset: selectedAsset,
        expectedAmountCrypto: requiredCryptoAmount,
        merchantWallet: PRO_RECEIVING_ADDRESS,
      });

      if (verification.isVerified) {
        handleFinalizeSubscription(
          txHash,
          verification.customerAddress || customerAddr,
          verification.actualAmount || requiredCryptoAmount
        );
      } else {
        throw new Error(verification.errorMessage || 'On-chain verification could not be confirmed.');
      }
    } catch (err: any) {
      console.error('Subscription signing error:', err);
      const msg = err?.info?.error?.message || err?.message || 'Transaction rejected or failed.';
      setErrorMsg(msg);
      setStep('awaiting_payment');
    } finally {
      setIsSigningWallet(false);
    }
  };

  // 2. Manual Hash Verification
  const handleVerifyManualHash = async () => {
    if (!txHashInput.trim()) {
      setErrorMsg('Please enter a valid transaction hash.');
      return;
    }

    setStep('verifying');
    setErrorMsg(null);

    try {
      const verification = await verifyBlockchainTransaction({
        txHash: txHashInput.trim(),
        expectedAsset: selectedAsset,
        expectedAmountCrypto: requiredCryptoAmount,
        merchantWallet: PRO_RECEIVING_ADDRESS,
      });

      if (verification.isVerified) {
        handleFinalizeSubscription(
          txHashInput.trim(),
          verification.customerAddress || walletState.evmAddress || 'Customer Wallet',
          verification.actualAmount || requiredCryptoAmount
        );
      } else {
        setErrorMsg(
          verification.errorMessage ||
            `Verification failed: Ensure you sent ${formatCryptoAmount(requiredCryptoAmount, selectedAsset)} ${selectedAsset} to ${PRO_RECEIVING_ADDRESS}`
        );
        setStep('awaiting_payment');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Please check network connectivity.');
      setStep('awaiting_payment');
    }
  };

  // 3. Automatic Background Scanner when viewing QR payment mode
  useEffect(() => {
    if (step !== 'awaiting_payment' || paymentMode !== 'qr' || !isOpen) return;

    setIsScanning(true);
    const interval = setInterval(async () => {
      if (isApprovedRef.current || isScanInFlightRef.current) return;
      isScanInFlightRef.current = true;

      try {
        const detected = await scanForIncomingPayment({
          merchantWallet: PRO_RECEIVING_ADDRESS,
          expectedAsset: selectedAsset,
          expectedAmountCrypto: requiredCryptoAmount,
          sessionStartTimestamp: sessionStartTime,
        });

        if (detected.isDetected && detected.txHash) {
          handleFinalizeSubscription(
            detected.txHash,
            detected.customerAddress || 'Direct Payer',
            detected.actualAmount || requiredCryptoAmount
          );
        }
      } catch {
        // Continue scanning
      } finally {
        isScanInFlightRef.current = false;
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      setIsScanning(false);
    };
  }, [step, paymentMode, isOpen, selectedAsset, requiredCryptoAmount, sessionStartTime]);

  if (!isOpen) return null;

  // Build Standard Payment URI for QR code
  const getQrPaymentUri = () => {
    if (selectedAsset === 'USDT') {
      try {
        const usdtStr = getCleanAmountString(requiredCryptoAmount, 6);
        const rawUnits = ethers.parseUnits(usdtStr, 6).toString();
        const contract = assetConfig.contractAddress || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        return `ethereum:${contract}@137/transfer?address=${PRO_RECEIVING_ADDRESS}&uint256=${rawUnits}`;
      } catch {
        return `ethereum:${PRO_RECEIVING_ADDRESS}`;
      }
    }
    if (selectedAsset === 'POL') {
      try {
        const polStr = getCleanAmountString(requiredCryptoAmount, 18);
        const wei = ethers.parseUnits(polStr, 18).toString();
        return `ethereum:${PRO_RECEIVING_ADDRESS}@137?value=${wei}`;
      } catch {
        return `ethereum:${PRO_RECEIVING_ADDRESS}`;
      }
    }
    if (selectedAsset === 'VERSE') {
      try {
        const verseStr = getCleanAmountString(requiredCryptoAmount, 18);
        const rawUnits = ethers.parseUnits(verseStr, 18).toString();
        const contract = assetConfig.contractAddress || '0xc3aa16362d381282d7bfcf73812d46e300958ad8';
        return `ethereum:${contract}@137/transfer?address=${PRO_RECEIVING_ADDRESS}&uint256=${rawUnits}`;
      } catch {
        return `ethereum:${PRO_RECEIVING_ADDRESS}`;
      }
    }
    if (selectedAsset === 'ETH') {
      try {
        const ethStr = getCleanAmountString(requiredCryptoAmount, 18);
        const wei = ethers.parseUnits(ethStr, 18).toString();
        return `ethereum:${PRO_RECEIVING_ADDRESS}@1?value=${wei}`;
      } catch {
        return `ethereum:${PRO_RECEIVING_ADDRESS}`;
      }
    }
    return `ethereum:${PRO_RECEIVING_ADDRESS}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#181a24] via-[#1a1c28] to-[#181a24] p-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                <span>{isRenewing ? 'Renew Merchant X Pro' : 'Upgrade to Merchant X Pro'}</span>
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase rounded-full">
                  $10 / Month
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Direct on-chain blockchain subscription • 30 days unlimited access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 break-words">{errorMsg}</div>
            </div>
          )}

          {/* STEP 1: SELECT PAYMENT ASSET */}
          {step === 'select_asset' && (
            <div className="space-y-4">
              {/* Value Proposition Highlights */}
              <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-purple-950/20 to-transparent border border-amber-500/30 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Pro Plan Unlocks:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-black">✓</span> Unlimited transactions
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-black">✓</span> Vector PDF Statements
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-black">✓</span> Full Analytics & Export
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 font-black">✓</span> Custom branded receipts
                  </div>
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Select Payment Asset ($10 USD equivalent)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_ASSETS.map((asset) => {
                    const isSelected = selectedAsset === asset;
                    const config = SUPPORTED_ASSETS[asset];
                    const rate = cryptoRatesUsd[asset] || (asset === 'USDT' ? 1 : 0.45);
                    const amount = rate > 0 ? PRO_PRICE_USD / rate : 10;

                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => setSelectedAsset(asset)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                            : 'bg-[#141620] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="mb-1">
                          <CryptoAssetIcon asset={asset} size="sm" />
                        </div>
                        <span className="text-xs font-bold text-white">{asset}</span>
                        <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {config.network}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-amber-300 mt-1">
                          ≈ {formatCryptoAmount(amount, asset)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Receiving Address Info Card */}
              <div className="p-3 bg-[#13151f] border border-zinc-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-semibold uppercase tracking-wider">Official Pro Receiving Address</span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    {copiedAddr ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-200 break-all bg-black/40 p-2 rounded-lg border border-zinc-800/60 select-all">
                  {PRO_RECEIVING_ADDRESS}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  setStep('awaiting_payment');
                  setSessionStartTime(Date.now());
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-sm uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Pay {formatCryptoAmount(requiredCryptoAmount, selectedAsset)} {selectedAsset}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: AWAITING PAYMENT (SIGN WITH WALLET OR SCAN QR) */}
          {step === 'awaiting_payment' && (
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="p-3.5 bg-[#141622] border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                    Pro Plan (30 Days)
                  </div>
                  <div className="text-xl font-black text-amber-400 font-display">
                    {formatCryptoAmount(requiredCryptoAmount, selectedAsset)} {selectedAsset}
                  </div>
                  <div className="text-xs text-zinc-400">
                    $10.00 USD on {assetConfig.network}
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setStep('select_asset')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Change Asset
                  </button>
                </div>
              </div>

              {/* Mode Toggle: Sign with Connected Wallet vs QR Code */}
              <div className="flex bg-[#12141c] p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentMode('wallet')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === 'wallet'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>1-Click Sign with Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('qr')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === 'qr'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR / Manual Hash</span>
                </button>
              </div>

              {/* MODE A: 1-CLICK WEB3 WALLET SIGNING */}
              {paymentMode === 'wallet' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#13151f] border border-zinc-800 rounded-xl text-xs text-zinc-300 space-y-1">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Direct Web3 Blockchain Signing</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Your browser wallet (MetaMask, Coinbase, Rainbow, OKX, etc.) will open to sign the exact payment of {formatCryptoAmount(requiredCryptoAmount, selectedAsset)} {selectedAsset} to the official receiving contract.
                    </p>
                  </div>

                  {/* Connected Wallet Info */}
                  <div className="flex items-center justify-between p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl text-xs">
                    <span className="text-zinc-400">Payer Address:</span>
                    <span className="font-mono text-zinc-200 font-semibold">
                      {walletState.evmAddress ? formatAddress(walletState.evmAddress, 6) : 'Not Connected (Will prompt)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignAndPay}
                    disabled={isSigningWallet}
                    className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-base uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSigningWallet ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                        <span>Confirming in Wallet...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-black" />
                        <span>Sign & Pay $10 ({formatCryptoAmount(requiredCryptoAmount, selectedAsset)} {selectedAsset})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* MODE B: QR CODE / EXTERNAL WALLET & HASH SUBMIT */}
              {paymentMode === 'qr' && (
                <div className="space-y-3">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner max-w-[220px] mx-auto">
                    <QRCodeSVG
                      value={getQrPaymentUri()}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Copy Amount & Address Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="py-2 px-3 bg-[#161822] hover:bg-[#1f2230] border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedAmount ? 'Amount Copied' : 'Copy Amount'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="py-2 px-3 bg-[#161822] hover:bg-[#1f2230] border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedAddr ? 'Address Copied' : 'Copy Address'}</span>
                    </button>
                  </div>

                  {/* Real-time Scanner Indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-400 py-1 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Listening for on-chain broadcast...</span>
                  </div>

                  {/* Manual Hash Submission Input */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Or Enter Transaction Hash to Verify
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0x... tx hash"
                        value={txHashInput}
                        onChange={(e) => setTxHashInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-black/60 border border-zinc-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyManualHash}
                        className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Verify TX
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security & Address Guarantee Notice */}
              <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Pro activations are guaranteed non-custodial. The system strictly validates confirmed on-chain transactions to address <strong className="text-zinc-200 font-mono">{formatAddress(PRO_RECEIVING_ADDRESS, 4)}</strong> before unlocking.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: VERIFYING STATE */}
          {step === 'verifying' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-amber-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Verifying Blockchain Transaction...
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                  Querying consensus nodes to confirm receipt of {formatCryptoAmount(requiredCryptoAmount, selectedAsset)} {selectedAsset}.
                </p>
              </div>
              {txHashInput && (
                <div className="font-mono text-[11px] text-zinc-400 bg-black/50 p-2 rounded-lg border border-zinc-800 max-w-sm break-all">
                  Hash: {txHashInput}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SUCCESS STATE (PRO ACTIVE ✓) */}
          {step === 'success' && confirmedTxRecord && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PRO ACTIVE ✓</span>
                </div>
                <h3 className="text-xl font-extrabold text-white font-display">
                  Merchant X Pro Unlocked!
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-sm">
                  Your 30-day Pro plan is active until{' '}
                  <strong className="text-white">
                    {new Date(confirmedTxRecord.periodEndTimestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </strong>.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="w-full p-3.5 bg-[#141622] border border-zinc-800 rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Plan Duration:</span>
                  <span className="text-zinc-200 font-semibold">30 Days (Unlimited Transactions)</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Settled Amount:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {confirmedTxRecord.cryptoAmount} {confirmedTxRecord.cryptoAsset} ($10.00 USD)
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Network:</span>
                  <span className="text-zinc-200">{confirmedTxRecord.network}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-zinc-400">Transaction Hash:</span>
                  <a
                    href={`${EXPLORER_URLS[confirmedTxRecord.network] || 'https://polygonscan.com'}/tx/${confirmedTxRecord.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>{formatAddress(confirmedTxRecord.txHash, 5)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
              >
                Return to Terminal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
