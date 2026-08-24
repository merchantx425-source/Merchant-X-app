import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, KeyRound } from 'lucide-react';
import { MerchantXLogo } from '../MerchantXLogo';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <MerchantXLogo size="sm" />
            <div>
              <h3 className="font-['Outfit'] font-bold text-base text-white">
                Privacy Policy
              </h3>
              <p className="text-[11px] text-slate-400">
                Effective Date: August 2026
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

        {/* Scrollable content */}
        <div className="overflow-y-auto pr-1 py-4 text-xs space-y-4 text-slate-300 leading-relaxed">
          {/* Critical Security Callout */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-['Outfit'] text-amber-300 block mb-0.5">
                Zero Private Key Access Guarantee
              </span>
              <p className="text-[11px] leading-tight text-amber-200/90">
                Merchant X operates as a non-custodial POS payment interface. Merchant X <strong>never requests, accesses, transfers, or stores private keys, seed phrases, or recovery mnemonics</strong> under any circumstances.
              </p>
            </div>
          </div>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              1. Information We Process
            </h4>
            <p>
              When you use Merchant X as a point-of-sale terminal:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-300">
              <li><strong>Public Blockchain Addresses:</strong> Used solely to generate transaction requests and verify incoming settlements on the Polygon, Ethereum, and Bitcoin blockchains.</li>
              <li><strong>Transaction Records:</strong> Amounts, transaction hashes, timestamps, and references stored locally within your browser storage.</li>
              <li><strong>Terminal Preferences:</strong> Selected fiat currency, theme, language, and merchant store profile settings.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              2. Biometric and WebAuthn Authentication
            </h4>
            <p>
              When biometric authentication is enabled, Merchant X relies on your device&apos;s standard W3C WebAuthn / Passkey platform authenticator. Biometric data (such as fingerprint or facial recognition) remains strictly locked inside your device hardware and is never transmitted or accessible to Merchant X.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit'] flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-purple-400" />
              3. Public Blockchain Nature
            </h4>
            <p>
              Transactions executed on the Polygon, Ethereum, and Bitcoin blockchains are publicly verifiable and immutable by network design.
            </p>
          </section>

          <section>
            <h4 className="font-bold text-sm text-white mb-1 font-['Outfit']">
              4. Contact & Inquiries
            </h4>
            <p>
              For privacy and data governance questions regarding Merchant X, contact your local terminal administrator or compliance team.
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
