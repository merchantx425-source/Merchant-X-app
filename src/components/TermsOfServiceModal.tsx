import React from 'react';
import { X, FileText } from 'lucide-react';
import { MerchantXLogo } from './MerchantXLogo';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#13151b] border border-purple-900/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <MerchantXLogo size="xs" />
            <h2 className="text-base font-bold font-display text-white">Terms of Service</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs text-zinc-300 leading-relaxed">
          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">1. Acceptance of Terms</h3>
            <p>
              By configuring, loading, or processing transactions through the Merchant X Point-of-Sale (POS) interface, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">2. Non-Custodial Merchant Protocol</h3>
            <p>
              Merchant X provides software tooling to display cryptocurrency payment invoices and verify on-chain confirmations across EVM networks (Polygon, Ethereum) and Bitcoin. Merchant X is not an exchange, custodian, bank, or payment processor. All settlement funds flow directly from customer wallets to your designated self-custody addresses.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">3. Blockchain Network & Gas Risks</h3>
            <p>
              Cryptocurrency transactions are irrevocable once committed to a blockchain. Network congestion, gas fee variations, and block reorganization are intrinsic properties of distributed ledger networks. The merchant is solely responsible for confirming appropriate on-chain block confirmations prior to fulfilling physical goods or services.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">4. Merchant Wallet Responsibility</h3>
            <p>
              The merchant is exclusively responsible for maintaining the security of their connected hardware, seed phrases, private keys, and software wallets. Merchant X cannot reverse, cancel, or refund unauthorized transactions.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">5. Service Availability & Compliance</h3>
            <p>
              Merchant X is provided &quot;as is&quot; and &quot;as available&quot;. Merchants agree to comply with all applicable local financial, tax, and anti-money laundering regulations in their operating jurisdictions.
            </p>
          </section>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Accept Terms
          </button>
        </div>
      </div>
    </div>
  );
};
