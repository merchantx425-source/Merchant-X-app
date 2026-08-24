import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { CryptoAsset, FiatCurrency, TransactionRecord } from '../types/merchant';
import { SUPPORTED_ASSETS, SUPPORTED_FIAT, EXPLORER_URLS, ERC20_ABI } from '../config/constants';
import {
  verifyBlockchainTransaction,
  scanForIncomingPayment,
  fetchRealAssetBalance,
  formatCryptoAmount,
  formatAddress,
} from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ArrowUpRight,
  Radio,
  RefreshCw,
  QrCode,
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
  const [copiedUri, setCopiedUri] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minute payment invoice window
  const [isScanning, setIsScanning] = useState(false);
  const [initialBalRaw, setInitialBalRaw] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [verifiedTx, setVerifiedTx] = useState<TransactionRecord | null>(null);
  const [lastScanNotice, setLastScanNotice] = useState<string>('Listening for on-chain broadcast...');
  const [qrMode, setQrMode] = useState<'smart' | 'address'>('smart');
  const [isWeb3Signing, setIsWeb3Signing] = useState(false);
  const [web3SignError, setWeb3SignError] = useState<string | null>(null);

  const assetConfig = SUPPORTED_ASSETS[cryptoAsset];
  const fiatConfig = SUPPORTED_FIAT[fiatCurrency];
  const isApprovedRef = useRef(false);
  const isScanInFlightRef = useRef(false);

  // Format precise crypto decimal string with no scientific notation
  const getCleanAmountString = (amount: number, maxDecimals: number = 8) => {
    return amount.toLocaleString('fullwide', {
      useGrouping: false,
      maximumFractionDigits: maxDecimals,
    });
  };

  // Build Standard Universal Web3 Crypto URI for Customer QR Code
  const getPaymentUri = () => {
    const cleanAddr = merchantWallet.trim();

    if (qrMode === 'address') {
      return cleanAddr;
    }

    if (cryptoAsset === 'BTC') {
      const btcAmountStr = getCleanAmountString(amountCrypto, 8);
      return `bitcoin:${cleanAddr}?amount=${btcAmountStr}&label=Merchant%20X`;
    }

    if (cryptoAsset === 'ETH') {
      try {
        const ethAmountStr = getCleanAmountString(amountCrypto, 18);
        const wei = ethers.parseUnits(ethAmountStr, 18).toString();
        return `ethereum:${cleanAddr}@1?value=${wei}`;
      } catch {
        return `ethereum:${cleanAddr}`;
      }
    }

    if (cryptoAsset === 'POL') {
      try {
        const polAmountStr = getCleanAmountString(amountCrypto, 18);
        const wei = ethers.parseUnits(polAmountStr, 18).toString();
        return `ethereum:${cleanAddr}@137?value=${wei}`;
      } catch {
        return `ethereum:${cleanAddr}`;
      }
    }

    if (cryptoAsset === 'USDT') {
      try {
        const usdtAmountStr = getCleanAmountString(amountCrypto, 6);
        const rawUnits = ethers.parseUnits(usdtAmountStr, 6).toString();
        const contract = assetConfig.contractAddress || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
        return `ethereum:${contract}@137/transfer?address=${cleanAddr}&uint256=${rawUnits}`;
      } catch {
        return `ethereum:${cleanAddr}`;
      }
    }

    if (cryptoAsset === 'VERSE') {
      try {
        const verseAmountStr = getCleanAmountString(amountCrypto, 18);
        const rawUnits = ethers.parseUnits(verseAmountStr, 18).toString();
        const contract = assetConfig.contractAddress || '0xc3aa16362d381282d7bfcf73812d46e300958ad8';
        return `ethereum:${contract}@137/transfer?address=${cleanAddr}&uint256=${rawUnits}`;
      } catch {
        return `ethereum:${cleanAddr}`;
      }
    }

    return `ethereum:${cleanAddr}`;
  };

  const paymentUri = getPaymentUri();

  // One-Click Direct Web3 Wallet Payment (Customer Signs Immediately)
  const handleDirectWeb3Pay = async () => {
    if (cryptoAsset === 'BTC') {
      // BTC deep-link opening
      window.location.href = `bitcoin:${merchantWallet}?amount=${getCleanAmountString(amountCrypto, 8)}`;
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setWeb3SignError('No browser Web3 wallet detected. Scan the QR code with your mobile wallet app.');
      return;
    }

    setIsWeb3Signing(true);
    setWeb3SignError(null);

    try {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('Wallet connection cancelled by user.');
      }

      const signer = await ethProvider.getSigner();
      const customerAddr = await signer.getAddress();

      // Check and switch network if necessary
      const isPolygonAsset = cryptoAsset === 'POL' || cryptoAsset === 'VERSE' || cryptoAsset === 'USDT';
      const targetChainIdHex = isPolygonAsset ? '0x89' : '0x1'; // 137 Polygon or 1 Ethereum

      const currentNetwork = await ethProvider.getNetwork();
      const currentChainId = Number(currentNetwork.chainId);

      if (isPolygonAsset && currentChainId !== 137) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x89',
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                  rpcUrls: ['https://polygon-rpc.com'],
                  blockExplorerUrls: ['https://polygonscan.com/'],
                },
              ],
            });
          } else {
            throw switchErr;
          }
        }
      } else if (!isPolygonAsset && currentChainId !== 1) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1' }],
        });
      }

      // Re-instantiate signer after potential chain switch
      const activeProvider = new ethers.BrowserProvider((window as any).ethereum);
      const activeSigner = await activeProvider.getSigner();

      let txResponse: any;

      if (cryptoAsset === 'POL' || cryptoAsset === 'ETH') {
        // Native Transfer
        const wei = ethers.parseEther(amountCrypto.toFixed(18));
        txResponse = await activeSigner.sendTransaction({
          to: merchantWallet,
          value: wei,
        });
      } else {
        // ERC-20 Transfer (VERSE or USDT)
        const decimals = assetConfig.decimals;
        const rawAmount = ethers.parseUnits(getCleanAmountString(amountCrypto, decimals), decimals);
        const contract = new ethers.Contract(assetConfig.contractAddress!, ERC20_ABI, activeSigner);
        txResponse = await contract.transfer(merchantWallet, rawAmount);
      }

      if (txResponse?.hash) {
        setLastScanNotice(`Payment submitted (${txResponse.hash.slice(0, 10)}...). Confirming on-chain...`);
        // Feed into manual verification immediately
        await handleVerifyTransaction(txResponse.hash);
      }
    } catch (err: any) {
      console.warn('Web3 signing error:', err);
      setWeb3SignError(err?.reason || err?.message || 'Transaction signing was rejected or failed.');
    } finally {
      setIsWeb3Signing(false);
    }
  };

  // Reset modal state when opening (NO automatic wallet launches for merchant)
  useEffect(() => {
    if (isOpen) {
      setStep('awaiting_payment');
      setSessionStartTime(Date.now());
      setErrorMsg(null);
      setTxHashInput('');
      setTimeLeft(900);
      isApprovedRef.current = false;
      setLastScanNotice(`Scanning ${assetConfig.network} network for incoming payment...`);

      // Fetch baseline initial balance for delta tracking
      fetchRealAssetBalance(cryptoAsset, merchantWallet).then((res) => {
        setInitialBalRaw(res.balanceRaw);
      });
    }
  }, [isOpen, cryptoAsset, merchantWallet, assetConfig.network]);

  // Payment Approved Success Handler (only invoked upon verified blockchain confirmation)
  const triggerPaymentApproved = useCallback(
    (params: {
      txHash: string;
      customerAddress?: string;
      actualAmount?: number;
      blockNumber?: number;
      timestamp?: number;
    }) => {
      if (isApprovedRef.current) return;
      isApprovedRef.current = true;
      setIsScanning(false);

      const now = new Date();
      const txRecord: TransactionRecord = {
        id: `TX-${Date.now().toString(36).toUpperCase()}`,
        reference: `MX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        amountFiat,
        fiatCurrency,
        amountCrypto: params.actualAmount || amountCrypto,
        cryptoAsset,
        network: assetConfig.network,
        cryptoRate,
        merchantWallet,
        customerWallet: params.customerAddress || 'Verified Customer',
        txHash: params.txHash,
        status: 'paid',
        timestamp: params.timestamp || Date.now(),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        formattedTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        blockNumber: params.blockNumber,
      };

      setVerifiedTx(txRecord);
      setStep('approved');

      // Confetti celebration
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#F59E0B', '#00D2FF', '#8A2BE2', '#10B981', '#ffffff'],
        });
      } catch {
        // Ignore
      }

      // Transition to the generated receipt after 1.5s visual confirmation
      setTimeout(() => {
        onPaymentSuccess(txRecord);
      }, 1500);
    },
    [amountFiat, fiatCurrency, amountCrypto, cryptoAsset, assetConfig.network, cryptoRate, merchantWallet, onPaymentSuccess]
  );

  // Background Automatic Continuous Rolling Scanner (checks every 2.5s)
  const performAutoScan = useCallback(async () => {
    if (!isOpen || step !== 'awaiting_payment' || isApprovedRef.current || isScanInFlightRef.current) return;

    isScanInFlightRef.current = true;
    setIsScanning(true);

    try {
      const scanResult = await scanForIncomingPayment({
        merchantWallet,
        expectedAsset: cryptoAsset,
        expectedAmountCrypto: amountCrypto,
        sessionStartTimestamp: sessionStartTime,
        initialBalanceRaw: initialBalRaw,
      });

      if (scanResult.isDetected && scanResult.txHash && !isApprovedRef.current) {
        setLastScanNotice(`✓ Verified payment on ${assetConfig.network}! Approving transaction...`);
        triggerPaymentApproved({
          txHash: scanResult.txHash,
          customerAddress: scanResult.customerAddress,
          actualAmount: scanResult.actualAmount,
          blockNumber: scanResult.blockNumber,
        });
      } else {
        setLastScanNotice(`Monitoring ${assetConfig.network} blocks for transfer... (${new Date().toLocaleTimeString()})`);
      }
    } catch (err) {
      console.warn('Auto scan notice:', err);
    } finally {
      isScanInFlightRef.current = false;
      setIsScanning(false);
    }
  }, [
    isOpen,
    step,
    merchantWallet,
    cryptoAsset,
    amountCrypto,
    sessionStartTime,
    initialBalRaw,
    assetConfig.network,
    triggerPaymentApproved,
  ]);

  // Continuous background polling
  useEffect(() => {
    if (!isOpen || step !== 'awaiting_payment') return;

    const firstTimeout = setTimeout(() => {
      performAutoScan();
    }, 800);

    const interval = setInterval(() => {
      performAutoScan();
    }, 2500);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [isOpen, step, performAutoScan]);

  // Invoice Timer Countdown
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
  const handleCopy = (text: string, type: 'addr' | 'amount' | 'uri') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'addr') {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      } else if (type === 'amount') {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      } else {
        setCopiedUri(true);
        setTimeout(() => setCopiedUri(false), 2000);
      }
    }
  };

  // Run Manual On-chain Blockchain Verification (if merchant/customer enters hash)
  const handleVerifyTransaction = async (hashToVerify?: string) => {
    const hash = (hashToVerify || txHashInput).trim();
    if (!hash) {
      setErrorMsg('Please enter a transaction hash to verify on-chain.');
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
        triggerPaymentApproved({
          txHash: hash,
          customerAddress: result.customerAddress,
          actualAmount: result.actualAmount,
          blockNumber: result.blockNumber,
          timestamp: result.timestamp,
        });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111319] border border-purple-900/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <CryptoAssetIcon asset={cryptoAsset} size="md" />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base font-display tracking-tight text-white flex items-center gap-1.5">
                {cryptoAsset} Payment
              </span>
              <span className="text-[10px] text-zinc-400">
                {assetConfig.network} Network • Non-Custodial Direct Pay
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
          <div className="py-3 space-y-3.5">
            {/* Amount Banner */}
            <div className="bg-[#181a24] border border-zinc-800/80 rounded-2xl p-3.5 text-center">
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

            {/* CUSTOMER PAYMENT QR CODE CARD */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#0a0c12] border border-zinc-800/90 rounded-2xl text-center space-y-3">
              <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-1">
                <span className="font-semibold text-zinc-300 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scan to Sign & Pay</span>
                </span>
                <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{formattedTimeLeft}</span>
                </div>
              </div>

              {/* QR Mode Switcher */}
              <div className="flex items-center p-0.5 bg-[#161822] rounded-xl border border-zinc-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setQrMode('smart')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    qrMode === 'smart'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Prefilled Payment QR
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('address')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    qrMode === 'address'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Address Only QR
                </button>
              </div>

              {/* Crisp SVG QR Code */}
              <div className="p-3.5 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <QRCodeSVG
                  value={paymentUri}
                  size={195}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="text-[11px] text-zinc-400 max-w-xs leading-tight">
                {qrMode === 'smart'
                  ? 'Scans directly into wallet with network, recipient & amount prefilled for 1-click signing.'
                  : 'Raw receiving address for older wallet scanners.'}
              </div>

              {/* One-Click Direct Web3 Sign & Pay Button */}
              <div className="w-full pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleDirectWeb3Pay}
                  disabled={isWeb3Signing}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {isWeb3Signing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Requesting Signature in Wallet...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-black font-extrabold" />
                      <span>Pay with Connected Web3 Wallet (Direct Sign)</span>
                    </>
                  )}
                </button>

                {web3SignError && (
                  <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-2 text-left">
                    {web3SignError}
                  </div>
                )}
              </div>
            </div>

            {/* LIVE ROLLING RADAR / AUTO-DETECTION PANEL */}
            <div className="bg-gradient-to-r from-[#0d1726] to-[#141226] border border-cyan-500/30 rounded-2xl p-3 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </div>
                  <span className="text-xs font-extrabold tracking-wide uppercase text-cyan-300">
                    WAITING FOR PAYMENT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => performAutoScan()}
                  disabled={isScanning}
                  className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Check Payment Now'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5 truncate">
                <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                <span className="truncate">{lastScanNotice}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-cyan-900/40">
                <span>Network: <strong className="text-zinc-300">{assetConfig.network}</strong></span>
                <span className="font-semibold text-emerald-400">Strict on-chain settlement</span>
              </div>
            </div>

            {/* Merchant Receiving Address Row */}
            <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-3 space-y-1.5">
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
                  className="flex-1 px-3 py-2 bg-[#14161f] border border-zinc-700 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleVerifyTransaction()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
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
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold tracking-wider uppercase rounded-full">
                {getTranslation(language, 'paymentApproved')} ✓
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
                {verifiedTx?.txHash || txHashInput ? (
                  <a
                    href={`${EXPLORER_URLS[assetConfig.network]}/tx/${verifiedTx?.txHash || txHashInput}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                  >
                    <span>{formatAddress(verifiedTx?.txHash || txHashInput, 4)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-emerald-400 font-mono text-[11px]">Auto-Confirmed on Blockchain ✓</span>
                )}
              </div>
            </div>

            {verifiedTx && (
              <button
                type="button"
                onClick={() => onPaymentSuccess(verifiedTx)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>View Receipt Now</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
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
                Back to POS Flow
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

