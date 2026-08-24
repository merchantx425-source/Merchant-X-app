import React, { useRef, useState } from 'react';
import { TransactionRecord } from '../../types/merchant';
import { SUPPORTED_FIAT, SUPPORTED_ASSETS, EXPLORER_URLS } from '../../config/constants';
import { formatAddress, formatCryptoAmount } from '../../services/blockchainService';
import { MerchantXLogo } from '../MerchantXLogo';
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';

interface ReceiptModalProps {
  receipt: TransactionRecord;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const { settings } = useMerchant();
  const [copiedHash, setCopiedHash] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const fiatConfig = SUPPORTED_FIAT[receipt.fiatCurrency] || SUPPORTED_FIAT.NGN;
  const assetConfig = SUPPORTED_ASSETS[receipt.cryptoAsset];
  const explorerBase = EXPLORER_URLS[receipt.network];
  const explorerLink = receipt.txHash
    ? receipt.network === 'Bitcoin'
      ? `${explorerBase}/tx/${receipt.txHash}`
      : `${explorerBase}/tx/${receipt.txHash}`
    : '#';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate text/markdown receipt summary
    const content = `========================================
         MERCHANT X PAYMENT RECEIPT
========================================
Status:           PAID ✓
Reference:        ${receipt.reference}
Merchant:         ${settings.merchantName}
Location:         ${settings.merchantLocation}
Date & Time:      ${receipt.formattedDate} at ${receipt.formattedTime}

Amount (Fiat):    ${fiatConfig.symbol}${receipt.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Crypto Settled:   ${formatCryptoAmount(receipt.amountCrypto, receipt.cryptoAsset)} ${receipt.cryptoAsset}
Network:          ${receipt.network}
Exchange Rate:    1 ${receipt.cryptoAsset} = ${fiatConfig.symbol}${receipt.cryptoRate.toLocaleString('en-US', { maximumFractionDigits: 2 })}

Merchant Wallet:  ${receipt.merchantWallet}
${receipt.customerWallet ? `Customer Wallet:  ${receipt.customerWallet}\n` : ''}Transaction Hash: ${receipt.txHash || 'N/A'}
${receipt.blockNumber ? `Block Number:     ${receipt.blockNumber}\n` : ''}
========================================
Thank you for using Merchant X POS Terminal
© 2026 Merchant X. All rights reserved.
========================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MerchantX_Receipt_${receipt.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `Merchant X Payment Receipt: Paid ${fiatConfig.symbol}${receipt.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${formatCryptoAmount(receipt.amountCrypto, receipt.cryptoAsset)} ${receipt.cryptoAsset}) on ${receipt.network}. Ref: ${receipt.reference}`;
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Merchant X Payment Receipt',
          text,
          url: receipt.txHash ? explorerLink : window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
        return;
      } catch (e) {
        console.warn('Native share failed or cancelled', e);
      }
    }

    // Fallback: Copy to clipboard
    navigator.clipboard.writeText(text);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  const copyTxHash = () => {
    if (receipt.txHash) {
      navigator.clipboard.writeText(receipt.txHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0d0f15] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer no-print"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Receipt Paper Container */}
        <div id="printable-receipt" ref={receiptRef} className="space-y-4">
          {/* Header */}
          <div className="text-center pt-2 pb-4 border-b border-dashed border-slate-800">
            <div className="flex justify-center mb-2">
              <MerchantXLogo size="lg" glow={false} />
            </div>
            <h2 className="text-xl font-extrabold font-['Outfit'] tracking-tight text-white uppercase">
              Merchant X
            </h2>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Payment Receipt
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {settings.merchantName} • {settings.merchantLocation}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-['Outfit'] font-extrabold text-sm text-emerald-300 tracking-wider">
              PAID ✓
            </span>
          </div>

          {/* Core Amount */}
          <div className="text-center py-2 bg-[#131620] rounded-2xl border border-slate-800/80 p-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Amount Paid
            </span>
            <div className="text-3xl font-extrabold text-white font-['Outfit'] mt-0.5">
              {fiatConfig.symbol}
              {receipt.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-bold text-amber-400 font-['JetBrains_Mono'] mt-1">
              {formatCryptoAmount(receipt.amountCrypto, receipt.cryptoAsset)}{' '}
              {receipt.cryptoAsset}
            </div>
          </div>

          {/* Receipt Breakdown Table */}
          <div className="space-y-2 text-xs divide-y divide-slate-800/50">
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Status</span>
              <span className="font-semibold text-emerald-400">PAID ✓</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Crypto Asset</span>
              <span className="font-medium text-white">{receipt.cryptoAsset}</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Network</span>
              <span className="font-medium text-white">{receipt.network}</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Merchant Wallet</span>
              <span className="font-['JetBrains_Mono'] text-slate-300">
                {formatAddress(receipt.merchantWallet, 6)}
              </span>
            </div>

            {receipt.customerWallet && (
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Customer Wallet</span>
                <span className="font-['JetBrains_Mono'] text-slate-300">
                  {formatAddress(receipt.customerWallet, 6)}
                </span>
              </div>
            )}

            {receipt.txHash && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-400">Transaction Hash</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={explorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-['JetBrains_Mono'] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>{formatAddress(receipt.txHash, 5)}</span>
                    <ExternalLink className="w-3 h-3 no-print" />
                  </a>
                  <button
                    type="button"
                    onClick={copyTxHash}
                    className="p-1 text-slate-400 hover:text-white rounded bg-slate-800/60 no-print"
                    title="Copy hash"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Date</span>
              <span className="font-medium text-white">{receipt.formattedDate}</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Time</span>
              <span className="font-medium text-white">{receipt.formattedTime}</span>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-slate-400">Reference ID</span>
              <span className="font-['JetBrains_Mono'] text-slate-300">{receipt.reference}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-3 text-center text-[10px] text-slate-500 border-t border-dashed border-slate-800">
            Official Merchant X Blockchain Payment Confirmation
          </div>
        </div>

        {/* Action Buttons: PRINT, DOWNLOAD, SHARE */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="h-11 rounded-xl bg-[#161822] hover:bg-[#202434] border border-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>PRINT</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="h-11 rounded-xl bg-[#161822] hover:bg-[#202434] border border-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>DOWNLOAD</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Share2 className="w-4 h-4" />
            <span>{shareSuccess ? 'COPIED!' : 'SHARE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
