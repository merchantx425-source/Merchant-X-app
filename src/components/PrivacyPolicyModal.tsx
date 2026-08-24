import React from 'react';
import { X, Shield } from 'lucide-react';
import { MerchantXLogo } from './MerchantXLogo';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#13151b] border border-purple-900/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <MerchantXLogo size="xs" />
            <h2 className="text-base font-bold font-display text-white">Merchant X Privacy Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs text-zinc-300 leading-relaxed">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-200">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Crucial Security Notice:</strong> Merchant X operates on a 100% non-custodial architecture. Merchant X never requests, processes, accesses, or stores your private keys, seed phrases, or wallet passwords.
            </span>
          </div>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">1. Information We Process</h3>
            <p>
              When using Merchant X, the application processes public cryptographic identifiers, including public wallet addresses (Polygon, Ethereum, and Bitcoin), on-chain transaction hashes, block confirmations, and localized terminal preferences.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">2. Local Terminal Storage</h3>
            <p>
              Your settlement preferences, selected display fiat currency, preferred visual themes, and local transaction receipts are stored exclusively within your client device&apos;s local storage. This information is under your direct control and is not shared with third-party advertising brokers.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">3. Public Blockchain Data</h3>
            <p>
              All cryptocurrency payments, including transfers of VERSE, POL, USDT, ETH, and BTC, are settled on decentralized public blockchains. Blockchain records are permanently immutable and accessible to the public network.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">4. Biometric & Passkey Authentication</h3>
            <p>
              Biometric authentication utilizes the standard W3C WebAuthn hardware API on your device. Merchant X never has access to raw biometric data such as fingerprints or facial geometry.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-white">5. Updates & Contact</h3>
            <p>
              Merchant X may update this policy to reflect protocol enhancements. For inquiries regarding security and data practices, consult official Merchant X terminal documentation.
            </p>
          </section>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
