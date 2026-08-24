import React, { useRef, useState } from 'react';
import { TransactionRecord, CryptoAsset } from '../types/merchant';
import { SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { MerchantXLogo } from './MerchantXLogo';
import { X, Printer, FileText, Share2, Check, ExternalLink, PlusCircle, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  merchantName?: string;
  merchantLocation?: string;
  language?: string;
  onNewPayment?: () => void;
}

const ASSET_THEMES: Record<
  CryptoAsset,
  {
    gradient: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
    tagline: string;
  }
> = {
  VERSE: {
    gradient: 'from-[#00d2ff] via-[#8a2be2] to-[#ff007a]',
    border: 'border-purple-500/40',
    badgeBg: 'bg-purple-950/80 border-purple-400/40',
    badgeText: 'text-cyan-300',
    accent: '#00d2ff',
    tagline: 'Bitcoin.com Verse Ecosystem Settlement',
  },
  BTC: {
    gradient: 'from-[#F7931A] via-[#E88000] to-[#FFAB40]',
    border: 'border-amber-500/40',
    badgeBg: 'bg-amber-950/80 border-amber-400/40',
    badgeText: 'text-amber-300',
    accent: '#F7931A',
    tagline: 'Bitcoin Blockchain Direct Settlement',
  },
  USDT: {
    gradient: 'from-[#26A17B] via-[#00B976] to-[#00E59B]',
    border: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-950/80 border-emerald-400/40',
    badgeText: 'text-emerald-300',
    accent: '#26A17B',
    tagline: 'Tether USD Stablecoin Settlement',
  },
  ETH: {
    gradient: 'from-[#627EEA] via-[#4F6BE8] to-[#8C9EFF]',
    border: 'border-blue-500/40',
    badgeBg: 'bg-blue-950/80 border-blue-400/40',
    badgeText: 'text-blue-300',
    accent: '#627EEA',
    tagline: 'Ethereum Virtual Machine Direct Settlement',
  },
  POL: {
    gradient: 'from-[#8247E5] via-[#7B3FE4] to-[#B388FF]',
    border: 'border-indigo-500/40',
    badgeBg: 'bg-indigo-950/80 border-indigo-400/40',
    badgeText: 'text-indigo-300',
    accent: '#8247E5',
    tagline: 'Polygon PoS Ultra-Fast Settlement',
  },
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  merchantName = 'Merchant X Store',
  merchantLocation = 'Terminal 01',
  language = 'en',
  onNewPayment,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !transaction) return null;

  const theme = ASSET_THEMES[transaction.cryptoAsset] || ASSET_THEMES.BTC;
  const fiatConfig = SUPPORTED_FIAT[transaction.fiatCurrency];
  const formattedFiat = `${fiatConfig.symbol}${transaction.amountFiat.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedCrypto = `${formatCryptoAmount(transaction.amountCrypto, transaction.cryptoAsset)} ${transaction.cryptoAsset}`;

  // PRINT RECEIPT
  const handlePrint = () => {
    window.print();
  };

  // DOWNLOAD RECEIPT AS COLORFUL PDF
  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // Capture high-resolution image of the receipt component
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0c0e14',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = 140; // centered card width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = Math.max(15, (pdfHeight - imgHeight) / 2);

      // Background accent in PDF
      pdf.setFillColor(12, 14, 20);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      // Add receipt image
      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

      // Save PDF file
      pdf.save(`MerchantX_Receipt_${transaction.reference}.pdf`);
    } catch (err) {
      console.warn('PDF export fallback:', err);
      // Fast fallback to print dialog if canvas rendering fails
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // SHARE RECEIPT
  const handleShare = async () => {
    const shareData = {
      title: `Merchant X Receipt — ${transaction.reference}`,
      text: `Merchant X Payment Receipt: Paid ${formattedFiat} (${formattedCrypto}) on ${transaction.network}. Reference: ${transaction.reference}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(
          `Merchant X Receipt: Paid ${formattedFiat} (${formattedCrypto}) on ${transaction.network}. Reference: ${transaction.reference} • TX: ${transaction.txHash}`
        );
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  const handleNewPaymentClick = () => {
    if (onNewPayment) {
      onNewPayment();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#12141c] border border-purple-900/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden max-h-[96vh] overflow-y-auto">
        {/* Top Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-300">
              {getTranslation(language, 'officialReceipt')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-400">
              VERIFIED
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & PDF Capture Container */}
        <div
          id="printable-receipt"
          ref={receiptRef}
          className="my-4 bg-[#0a0c12] border border-zinc-800/90 rounded-2xl relative shadow-2xl text-white overflow-hidden"
        >
          {/* COLORFUL TOP HERO GRADIENT BANNER */}
          <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradient}`} />

          <div className="p-5 sm:p-6 space-y-4">
            {/* Header / Brand */}
            <div className="flex flex-col items-center text-center pb-3 border-b border-dashed border-zinc-800">
              <div className="flex items-center gap-2">
                <MerchantXLogo size="md" />
                <CryptoAssetIcon asset={transaction.cryptoAsset} size="md" />
              </div>
              <h1 className="text-xl font-extrabold font-display tracking-tight mt-2 text-white">
                MERCHANT <span className="text-amber-400">X</span>
              </h1>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                Official Crypto Receipt
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {merchantName} • {merchantLocation}
              </div>
            </div>

            {/* COLORFUL STATUS & AMOUNT HERO */}
            <div className="relative py-4 px-3 rounded-2xl bg-gradient-to-b from-[#141824] to-[#0c0e17] border border-zinc-800 text-center space-y-1 overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-extrabold tracking-wider uppercase">
                <Check className="w-3.5 h-3.5" /> PAID & SETTLED ✓
              </div>

              <div className="text-3xl sm:text-4xl font-extrabold font-display text-white pt-1">
                {formattedFiat}
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-black/60 border border-zinc-700/60 text-xs font-mono font-bold text-amber-300">
                {formattedCrypto}
              </div>

              <div className="text-[10px] text-zinc-400 pt-1">
                {theme.tagline}
              </div>
            </div>

            {/* Structured Itemized Details */}
            <div className="space-y-2 text-xs border-b border-dashed border-zinc-800 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Reference:</span>
                <span className="font-mono font-bold text-amber-400">{transaction.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Order ID:</span>
                <span className="font-mono text-zinc-300">{transaction.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'paymentAsset')}:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <CryptoAssetIcon asset={transaction.cryptoAsset} size="sm" />
                  <span>{transaction.cryptoAsset} ({transaction.network})</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Market Rate:</span>
                <span className="font-mono text-zinc-300">
                  {fiatConfig.symbol}{transaction.cryptoRate?.toLocaleString('en-US') || '1'} / {transaction.cryptoAsset}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'date')} / {getTranslation(language, 'time')}:</span>
                <span className="text-zinc-300">{transaction.formattedDate}, {transaction.formattedTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'merchantWallet')}:</span>
                <span className="font-mono text-zinc-300">{formatAddress(transaction.merchantWallet, 4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Customer:</span>
                <span className="font-mono text-zinc-300">{formatAddress(transaction.customerWallet, 4)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                <span className="text-zinc-400">{getTranslation(language, 'txHash')}:</span>
                {transaction.txHash ? (
                  <a
                    href={`${EXPLORER_URLS[transaction.network]}/tx/${transaction.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                  >
                    <span>{formatAddress(transaction.txHash, 4)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-mono text-emerald-400">Verified On-Chain</span>
                )}
              </div>
            </div>

            {/* Non-Custodial Trust Badge Footer */}
            <div className="text-center space-y-1 pt-1">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Non-Custodial Direct Settlement</span>
              </div>
              <div className="text-[9px] text-zinc-500">
                Merchant X • Instant Multichain Crypto Terminal
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Action Buttons: Print, Download PDF, Share */}
        <div className="grid grid-cols-3 gap-2 pt-1 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>PRINT</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 rounded-xl text-xs font-extrabold text-white transition-all cursor-pointer shadow-md"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
            ) : (
              <FileText className="w-4 h-4 text-cyan-300" />
            )}
            <span>{isGeneratingPdf ? 'EXPORTING...' : 'PDF RECEIPT'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{copiedLink ? 'Copied!' : 'SHARE'}</span>
          </button>
        </div>

        {/* NEW PAYMENT BUTTON */}
        <div className="pt-3 no-print">
          <button
            type="button"
            onClick={handleNewPaymentClick}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>NEW PAYMENT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
