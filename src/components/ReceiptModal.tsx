import React, { useRef, useState } from 'react';
import { TransactionRecord, CryptoAsset } from '../types/merchant';
import { SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import { MerchantXLogo } from './MerchantXLogo';
import {
  X,
  Printer,
  FileText,
  Share2,
  Check,
  ExternalLink,
  PlusCircle,
  ShieldCheck,
  Loader2,
  Copy,
  CheckCheck,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !transaction) return null;

  const theme = ASSET_THEMES[transaction.cryptoAsset] || ASSET_THEMES.BTC;
  const fiatConfig = SUPPORTED_FIAT[transaction.fiatCurrency];
  const formattedFiat = `${fiatConfig.symbol}${transaction.amountFiat.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedCrypto = `${formatCryptoAmount(transaction.amountCrypto, transaction.cryptoAsset)} ${transaction.cryptoAsset}`;
  const explorerUrl = transaction.txHash
    ? `${EXPLORER_URLS[transaction.network]}/tx/${transaction.txHash}`
    : `${EXPLORER_URLS[transaction.network]}/address/${transaction.merchantWallet}`;

  // PRINT RECEIPT
  const handlePrint = () => {
    window.print();
  };

  // COPY TX HASH
  const handleCopyHash = () => {
    if (transaction.txHash && navigator.clipboard) {
      navigator.clipboard.writeText(transaction.txHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  // DOWNLOAD CRISP VECTOR PDF RECEIPT
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = 18;

      // 1. Header Banner Box
      doc.setFillColor(15, 17, 26);
      doc.rect(0, 0, pageWidth, 44, 'F');

      // Accent Ribbon Bar
      doc.setFillColor(245, 158, 11); // Amber accent
      doc.rect(0, 44, pageWidth, 2.5, 'F');

      // Brand Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('MERCHANT X', margin, 18);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('OFFICIAL CRYPTO PAYMENT RECEIPT', margin, 25);
      doc.text('100% Non-Custodial Multi-Chain Settlement', margin, 31);
      doc.setTextColor(148, 163, 184);
      doc.text(`${merchantName} • ${merchantLocation}`, margin, 37);

      // Right-aligned header metadata
      doc.setFontSize(9);
      doc.setTextColor(226, 232, 240);
      doc.text(`DATE: ${transaction.formattedDate} ${transaction.formattedTime}`, pageWidth - margin, 18, { align: 'right' });
      doc.text(`REF: ${transaction.reference}`, pageWidth - margin, 25, { align: 'right' });
      doc.text(`ORDER ID: ${transaction.id.slice(0, 16)}`, pageWidth - margin, 32, { align: 'right' });
      doc.text(`NETWORK: ${transaction.network}`, pageWidth - margin, 39, { align: 'right' });

      y = 56;

      // 2. Status Box (Paid & Confirmed)
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'FD');

      doc.setTextColor(5, 150, 105);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT STATUS: CONFIRMED & SETTLED ON-CHAIN', margin + 6, y + 8);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 118, 110);
      doc.text(
        `Direct peer-to-peer blockchain settlement confirmed on ${transaction.network} public ledger.`,
        margin + 6,
        y + 15
      );

      y += 28;

      // 3. Amount Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL AMOUNT PAID', margin + 8, y + 9);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(formattedFiat, margin + 8, y + 23);

      doc.setFontSize(13);
      doc.setTextColor(217, 119, 6);
      doc.text(`= ${formattedCrypto}`, pageWidth - margin - 8, y + 23, { align: 'right' });

      y += 40;

      // 4. Itemized Details Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('TRANSACTION AUDIT TRAIL', margin, y);
      y += 3;

      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      const rows: [string, string][] = [
        ['Merchant Store', merchantName],
        ['POS Terminal ID', merchantLocation],
        ['Settled Crypto Asset', `${transaction.cryptoAsset} (${transaction.network})`],
        ['Market Conversion Rate', `${fiatConfig.symbol}${transaction.cryptoRate?.toLocaleString('en-US') || '1'} / 1 ${transaction.cryptoAsset}`],
        ['Receipt Reference No.', transaction.reference],
        ['Invoice / Order ID', transaction.id],
        ['Merchant Receiving Address', transaction.merchantWallet],
        ['Customer Payer Address', transaction.customerWallet || 'Direct Web3 Wallet'],
        ['Blockchain Confirmation', 'Mined & Finalized on Public Ledger'],
        ['Transaction Hash', transaction.txHash || 'Mined On-Chain'],
      ];

      doc.setFontSize(9);
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(label, margin + 2, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);

        const maxValWidth = 98;
        const splitVal = doc.splitTextToSize(value, maxValWidth);
        doc.text(splitVal, pageWidth - margin - 2, y, { align: 'right' });

        y += Math.max(6.5, splitVal.length * 4.5 + 2);
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y - 1.5, pageWidth - margin, y - 1.5);
      });

      y += 4;

      // 5. Blockchain Explorer Link Box
      if (transaction.txHash) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

        doc.setTextColor(146, 64, 14);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('BLOCKCHAIN EXPLORER VERIFICATION LINK:', margin + 4, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 83, 9);
        doc.textWithLink(explorerUrl, margin + 4, y + 10.5, { url: explorerUrl });
        y += 20;
      }

      // 6. Security Footer & Disclaimer
      y = Math.max(y, 252);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('NON-CUSTODIAL SETTLEMENT GUARANTEE', margin, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(148, 163, 184);
      const disclaimer =
        'This receipt certifies a finalized non-custodial cryptocurrency transaction broadcasted directly to the public blockchain network. Merchant X does not intermediate, hold, or custody merchant funds; 100% of all payments settle directly to the merchant receiving wallet. Retain this digital receipt for accounting and audit records.';
      const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth);
      doc.text(splitDisclaimer, margin, y);

      doc.save(`MerchantX_Receipt_${transaction.reference}.pdf`);
    } catch (err) {
      console.warn('Vector PDF export notice:', err);
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
          `Merchant X Receipt: Paid ${formattedFiat} (${formattedCrypto}) on ${transaction.network}. Reference: ${transaction.reference} • TX: ${transaction.txHash || 'Mined'}`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#11131a] border border-purple-900/30 rounded-3xl p-4 sm:p-6 shadow-2xl text-white overflow-hidden max-h-[96vh] overflow-y-auto">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-300">
              {getTranslation(language, 'officialReceipt')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>PAID & VERIFIED</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic High-Fidelity POS Digital Receipt */}
        <div
          id="printable-receipt"
          className="my-4 bg-[#090b10] border border-zinc-800 rounded-2xl relative shadow-2xl text-white overflow-hidden"
        >
          {/* Top Decorative Ribbon */}
          <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradient}`} />

          <div className="p-5 sm:p-6 space-y-4">
            {/* Store & Branding Header */}
            <div className="flex flex-col items-center text-center pb-3 border-b border-dashed border-zinc-800">
              <div className="flex items-center gap-2">
                <MerchantXLogo size="md" />
                <CryptoAssetIcon asset={transaction.cryptoAsset} size="md" />
              </div>
              <h1 className="text-2xl font-black font-display tracking-tight mt-1 text-white">
                MERCHANT <span className="text-amber-400">X</span>
              </h1>
              <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest mt-0.5">
                Official Crypto Tax Receipt
              </div>
              <div className="text-xs text-zinc-400 font-medium mt-0.5">
                {merchantName} • {merchantLocation}
              </div>
            </div>

            {/* Paid Stamp & Amount Card */}
            <div className="relative py-4 px-3 rounded-2xl bg-gradient-to-b from-[#151926] to-[#0c0e18] border border-zinc-800 text-center space-y-2 overflow-hidden shadow-inner">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-black tracking-wider uppercase">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>PAYMENT COMPLETED & SETTLED</span>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
                {formattedFiat}
              </div>

              <div className="inline-block px-3.5 py-1 rounded-full bg-black/60 border border-zinc-700/60 text-xs font-mono font-bold text-amber-300">
                {formattedCrypto}
              </div>

              <div className="text-[11px] text-zinc-400 font-medium">
                {theme.tagline}
              </div>
            </div>

            {/* Itemized Audit Trail */}
            <div className="space-y-2.5 text-xs border-b border-dashed border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Receipt Reference:</span>
                <span className="font-mono font-bold text-amber-400 text-xs">{transaction.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Order ID:</span>
                <span className="font-mono text-zinc-300 text-[11px]">{transaction.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'paymentAsset')}:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CryptoAssetIcon asset={transaction.cryptoAsset} size="sm" />
                  <span>{transaction.cryptoAsset} ({transaction.network})</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Settlement Rate:</span>
                <span className="font-mono text-zinc-300">
                  {fiatConfig.symbol}{transaction.cryptoRate?.toLocaleString('en-US') || '1'} / 1 {transaction.cryptoAsset}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'date')} / {getTranslation(language, 'time')}:</span>
                <span className="text-zinc-300">{transaction.formattedDate}, {transaction.formattedTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'merchantWallet')}:</span>
                <span className="font-mono text-zinc-300">{formatAddress(transaction.merchantWallet, 6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Customer Payer:</span>
                <span className="font-mono text-zinc-300">{formatAddress(transaction.customerWallet, 6)}</span>
              </div>

              {/* Transaction Hash */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                <span className="text-zinc-400">{getTranslation(language, 'txHash')}:</span>
                {transaction.txHash ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1 font-bold"
                    >
                      <span>{formatAddress(transaction.txHash, 6)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy transaction hash"
                    >
                      {copiedHash ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-emerald-400 text-xs font-bold">Mined & Confirmed On-Chain</span>
                )}
              </div>
            </div>

            {/* Blockchain Verification QR Code & Non-Custodial Guarantee */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#13151f] rounded-xl border border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>100% Non-Custodial Direct Settlement</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Scan QR with your phone to audit and verify this live transaction on {transaction.network} Block Explorer.
                </p>
              </div>

              <div className="p-1.5 bg-white rounded-lg shrink-0 shadow">
                <QRCodeSVG value={explorerUrl} size={62} level="M" />
              </div>
            </div>

            {/* Barcode & Security Watermark */}
            <div className="text-center pt-2 space-y-1.5">
              {/* Simulated Barcode */}
              <div className="h-6 w-4/5 mx-auto bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700 opacity-60 rounded flex items-center justify-center">
                <span className="font-mono text-[9px] text-zinc-300 tracking-[0.3em]">
                  ||||| | |||| || ||||| |||| | |||
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                AUTH NO: {transaction.reference} • THANK YOU FOR YOUR PAYMENT
              </div>
            </div>
          </div>
        </div>

        {/* 3 Main Action Buttons: Print, Download PDF, Share */}
        <div className="grid grid-cols-3 gap-2 pt-1 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>PRINT</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 border border-amber-400/50 rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <FileText className="w-4 h-4 text-black" />
            )}
            <span>{isGeneratingPdf ? 'EXPORTING...' : 'PDF RECEIPT'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow"
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
            className="w-full py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border border-zinc-700/80 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>NEW PAYMENT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
