import React, { useRef } from 'react';
import { TransactionRecord } from '../types/merchant';
import { SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { MerchantXLogo } from './MerchantXLogo';
import { X, Printer, Download, Share2, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  merchantName?: string;
  merchantLocation?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  merchantName = 'Merchant X Store #1',
  merchantLocation = 'Lagos, Nigeria',
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen || !transaction) return null;

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

  // DOWNLOAD RECEIPT as clean text/summary file
  const handleDownload = () => {
    const textContent = `
========================================
             MERCHANT X
          PAYMENT RECEIPT
========================================
Status:            PAID ✓
Reference:         ${transaction.reference}
Date:              ${transaction.formattedDate}
Time:              ${transaction.formattedTime}
----------------------------------------
Merchant:          ${merchantName}
Location:          ${merchantLocation}
----------------------------------------
Total Amount:      ${formattedFiat}
Crypto Amount:     ${formattedCrypto}
Crypto Asset:      ${transaction.cryptoAsset}
Network:           ${transaction.network}
----------------------------------------
Merchant Wallet:   ${transaction.merchantWallet}
Customer Wallet:   ${transaction.customerWallet || 'N/A'}
Tx Hash:           ${transaction.txHash || 'N/A'}
Explorer:          ${EXPLORER_URLS[transaction.network]}/tx/${transaction.txHash}
========================================
      Thank you for your business!
         Powered by Merchant X
========================================
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MerchantX_Receipt_${transaction.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        // User cancelled or unsupported
      }
    } else {
      // Fallback copy link
      if (navigator.clipboard) {
        navigator.clipboard.writeText(
          `Merchant X Receipt: Paid ${formattedFiat} (${formattedCrypto}) on ${transaction.network}. TX: ${transaction.txHash}`
        );
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#13151b] border border-purple-900/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Top Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 no-print">
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">Official Receipt</span>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          id="printable-receipt"
          ref={receiptRef}
          className="my-4 p-6 bg-[#090a0f] border border-zinc-800 rounded-2xl relative shadow-inner text-white"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-zinc-700">
            <MerchantXLogo size="md" />
            <h1 className="text-xl font-extrabold font-display tracking-tight mt-2 text-white">
              MERCHANT <span className="text-amber-400">X</span>
            </h1>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mt-0.5">
              Payment Receipt
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              {merchantName} • {merchantLocation}
            </div>
          </div>

          {/* Status Badge */}
          <div className="py-3 flex flex-col items-center justify-center text-center border-b border-dashed border-zinc-700">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-extrabold tracking-wider uppercase">
              <Check className="w-3.5 h-3.5" /> PAID ✓
            </div>
            <div className="text-3xl font-extrabold font-display text-white mt-2">
              {formattedFiat}
            </div>
            <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
              {formattedCrypto}
            </div>
          </div>

          {/* Key-value Data Rows */}
          <div className="py-3.5 space-y-2 text-xs border-b border-dashed border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Reference:</span>
              <span className="font-mono font-semibold text-zinc-200">{transaction.reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Crypto Asset:</span>
              <span className="font-semibold text-amber-400">{transaction.cryptoAsset}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Network:</span>
              <span className="font-semibold text-zinc-200">{transaction.network}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Merchant Wallet:</span>
              <span className="font-mono text-zinc-300">{formatAddress(transaction.merchantWallet, 4)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Date:</span>
              <span className="text-zinc-300">{transaction.formattedDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Time:</span>
              <span className="text-zinc-300">{transaction.formattedTime}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Transaction Hash:</span>
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
                <span className="font-mono text-zinc-400">Pending</span>
              )}
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="pt-3 text-center space-y-1">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
              Cryptographically Verified On-Chain
            </div>
            <div className="text-[9px] text-zinc-500">
              © 2026 Merchant X • Non-Custodial Terminal
            </div>
          </div>
        </div>

        {/* 3 Main Action Buttons: Print, Download, Share */}
        <div className="grid grid-cols-3 gap-2 pt-2 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 py-3 px-2 bg-[#1a1c24] hover:bg-[#232733] border border-zinc-700/80 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
