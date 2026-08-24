import React from 'react';
import { X, FileText, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { MerchantXLogo } from '../MerchantXLogo';

interface TermsOfServiceModalProps {
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <MerchantXLogo size="sm" />
            <div>
              <h3 className="font-['Outfit'] font-bold text-base text-white">
                Terms of Service
              </h3>
              <p className="text-[11px] text-slate-400">
                Merchant X POS Terminal Agreement • 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable text */}
        <div className="overflow-y-auto pr-1 py-4 text-xs space-y-4 text-slate-300 leading-relaxed">
          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              1. Merchant Agreement & Scope
            </h4>
            <p>
              By accessing or using the Merchant X crypto payment point-of-sale software, you agree to these Terms of Service. Merchant X provides non-custodial tools facilitating cryptocurrency payment calculation, merchant wallet address coordination, and on-chain verification for commercial transactions.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              2. Blockchain Transaction Risks & Volatility
            </h4>
            <p>
              Cryptocurrency transactions are irrevocable and settled on decentralized networks (Polygon, Ethereum, Bitcoin). Merchants acknowledge that blockchain network congestion, fluctuating gas / mining fees, and price volatility during the checkout interval are inherent properties of distributed ledger technology.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              3. Transaction Verification & Settlement
            </h4>
            <p>
              Merchant X verifies incoming payments by inspecting real on-chain transaction receipts and block confirmations. A transaction is considered finalized only when confirmed on the corresponding blockchain.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              4. Wallet Security & Non-Custodial Nature
            </h4>
            <p>
              Merchants maintain sole responsibility for the security, custody, and backup of their connected private wallets, hardware devices, and receiving addresses. Merchant X holds no customer funds and cannot reverse on-chain transactions.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit']">
              5. Prohibited Misuse
            </h4>
            <p>
              You agree not to use Merchant X for unlawful commerce, sanctions evasion, money laundering, fraud, or activities violating applicable local and international financial regulations.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-['Outfit'] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            I Understand and Agree
          </button>
        </div>
      </div>
    </div>
  );
};
