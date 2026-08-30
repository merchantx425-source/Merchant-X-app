import React, { useState } from 'react';
import {
  FileDown,
  Printer,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Sparkles,
  Award,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { MerchantXLogo } from '../MerchantXLogo';
import { VerseLogo } from '../VerseLogo';

interface PdfReceiptViewerProps {
  onDownloadRealPdf?: () => void;
  isDownloading?: boolean;
}

export const PdfReceiptViewer: React.FC<PdfReceiptViewerProps> = ({
  onDownloadRealPdf,
  isDownloading = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'large'>('normal');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = () => {
    setDownloadSuccess(true);
    if (onDownloadRealPdf) {
      onDownloadRealPdf();
    }
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 4000);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Action Toolbar */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#141824] border border-zinc-800 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-zinc-300 font-bold text-[11px]">MerchantX_Receipt_MX-882910.pdf</span>
          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[9px] font-mono">100% Non-Custodial</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel(zoomLevel === 'normal' ? 'large' : 'normal')}
            className="p-1 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-md transition-colors"
            title="Toggle Zoom"
          >
            {zoomLevel === 'normal' ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded-lg flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <FileDown className="w-3 h-3" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* PDF DOCUMENT CANVAS CONTAINER */}
      <div
        className={`w-full max-w-md bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 transition-all duration-300 ${
          zoomLevel === 'large' ? 'scale-105' : 'scale-100'
        }`}
      >
        {/* Top Gold Foil Strip */}
        <div className="h-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        <div className="p-4 sm:p-5 space-y-3.5 text-left">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-black font-display uppercase">
                  MERCHANT <span className="text-amber-600">X</span>
                </span>
                <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold rounded">
                  TAX INVOICE
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Point-of-Sale Payment Settlement</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-600 block">RECEIPT #</span>
              <span className="text-xs font-mono font-black text-black">MX-882910</span>
            </div>
          </div>

          {/* Amount Paid Highlight Box */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900">Total Amount Paid</span>
            <div className="text-2xl font-black text-black font-display tracking-tight">$0.50 USD</div>
            <div className="text-xs font-mono font-bold text-amber-700 flex items-center justify-center gap-1 mt-0.5">
              <span>22,273.00 VERSE</span>
              <span className="text-[9px] px-1 bg-amber-200 text-amber-900 rounded">Polygon</span>
            </div>
          </div>

          {/* Itemized Cryptographic Audit Table */}
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Date / UTC Timestamp:</span>
              <span className="text-zinc-900 font-semibold">{new Date().toUTCString().slice(0, 22)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Customer Payer:</span>
              <span className="text-zinc-900 font-semibold">Bitcoin.com Wallet</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Merchant Recipient:</span>
              <span className="text-zinc-900 font-semibold">0x116d...2C0f31</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Network / Chain:</span>
              <span className="text-zinc-900 font-semibold">Polygon PoS (137)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Transaction Hash:</span>
              <span className="text-zinc-900 font-semibold truncate max-w-[170px]">0x6b0a35c1...06d7f7</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Processor Custody Fee:</span>
              <span className="text-emerald-700 font-bold">$0.00 (0% Fee)</span>
            </div>
          </div>

          {/* Verification Badge & QR Footprint */}
          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold">100% Cryptographically Verified</span>
            </div>

            <div className="text-right text-[9px] text-zinc-400 font-mono">
              <span>Audited on PolygonScan</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-zinc-100 px-4 py-2 border-t border-zinc-200 text-center text-[9px] text-zinc-500 font-mono">
          Merchant X Non-Custodial Terminal • Zero Middlemen • Direct Self-Custody Payouts
        </div>
      </div>

      {downloadSuccess && (
        <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Receipt PDF generated and opened in high-resolution preview!</span>
        </div>
      )}
    </div>
  );
};
