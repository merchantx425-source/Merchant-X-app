import React, { useState, useEffect } from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { AppTheme, FiatCurrency } from '../../types/merchant';
import { SUPPORTED_FIAT } from '../../config/constants';
import { formatAddress } from '../../services/blockchainService';
import {
  isBiometricAvailable,
  registerBiometricPasskey,
} from '../../services/biometricService';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { WalletConnectModal } from '../Wallet/WalletConnectModal';
import { MerchantXLogo } from '../MerchantXLogo';
import {
  Wallet,
  Receipt,
  FileSpreadsheet,
  Download,
  Moon,
  Sun,
  Laptop,
  Languages,
  DollarSign,
  Fingerprint,
  Share2,
  Shield,
  FileText,
  ChevronRight,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    wallet,
    disconnectWallet,
    transactions,
    exportTransactions,
    setCurrentTab,
  } = useMerchant();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    isBiometricAvailable().then((supported) => {
      setBiometricSupported(supported);
    });
  }, []);

  const handleToggleBiometric = async () => {
    setBiometricError(null);
    if (!biometricSupported) {
      setBiometricError('Biometric authentication is not available on this device.');
      return;
    }

    if (!settings.biometricEnabled) {
      try {
        await registerBiometricPasskey(settings.merchantName);
        updateSettings({ biometricEnabled: true });
      } catch (err: any) {
        setBiometricError(err.message || 'Failed to setup biometric authentication.');
      }
    } else {
      updateSettings({ biometricEnabled: false });
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'Merchant X — Crypto Payment POS',
      text: 'Merchant X — Next-generation cryptocurrency merchant point-of-sale terminal.',
      url: window.location.href,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        console.warn('Native share error or dismissed', e);
      }
    }

    // Fallback: Copy link
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold font-['Outfit'] tracking-tight text-white">
            Settings
          </h2>
          <p className="text-xs text-slate-400">
            Terminal preferences & configurations
          </p>
        </div>
        <MerchantXLogo size="sm" />
      </div>

      <div className="space-y-4">
        {/* ================= ACCOUNT / WALLET ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              Account / Wallet
            </h3>
          </div>

          <div className="bg-[#171a24] border border-slate-800/60 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block font-['Outfit']">
                  Connected Wallet
                </span>
                <p className="text-[11px] text-slate-400 font-['JetBrains_Mono'] mt-0.5">
                  {wallet.evmAddress ? (
                    formatAddress(wallet.evmAddress, 6)
                  ) : settings.customEvmReceivingAddress ? (
                    formatAddress(settings.customEvmReceivingAddress, 6)
                  ) : (
                    'Not Connected'
                  )}
                  {wallet.btcAddress || settings.customBtcReceivingAddress ? (
                    <span className="text-amber-400 ml-1">
                      (BTC: {formatAddress(wallet.btcAddress || settings.customBtcReceivingAddress, 3)})
                    </span>
                  ) : null}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  wallet.isConnected || settings.customEvmReceivingAddress
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {wallet.isConnected || settings.customEvmReceivingAddress ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="flex-1 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {wallet.isConnected ? 'Reconnect Wallet' : 'Connect Wallet'}
            </button>
            {wallet.isConnected && (
              <button
                type="button"
                onClick={disconnectWallet}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* ================= TRANSACTIONS ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              Transactions
            </h3>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setCurrentTab('transactions')}
              className="w-full p-3 bg-[#171a24] hover:bg-[#1f2332] border border-slate-800/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div>
                <span className="text-xs font-bold text-white block">
                  Transaction History
                </span>
                <span className="text-[11px] text-slate-400">
                  Inspect verified payments ({transactions.length} total)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportTransactions('csv')}
                disabled={transactions.length === 0}
                className="p-2.5 bg-[#171a24] hover:bg-[#1f2332] disabled:opacity-40 border border-slate-800/60 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportTransactions('json')}
                disabled={transactions.length === 0}
                className="p-2.5 bg-[#171a24] hover:bg-[#1f2332] disabled:opacity-40 border border-slate-800/60 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= APPEARANCE ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              Appearance
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['dark', 'light', 'system'] as AppTheme[]).map((themeOption) => {
              const isSelected = settings.theme === themeOption;
              return (
                <button
                  key={themeOption}
                  type="button"
                  onClick={() => updateSettings({ theme: themeOption })}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#171a24] border-slate-800/60 text-slate-400 hover:text-white hover:bg-[#1f2332]'
                  }`}
                >
                  {themeOption === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : themeOption === 'light' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                  <span className="text-xs capitalize">{themeOption}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= PREFERENCES (LANGUAGE & CURRENCY) ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              Preferences
            </h3>
          </div>

          {/* Currency selection */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Display Currency
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(SUPPORTED_FIAT) as FiatCurrency[]).map((cur) => {
                const isSelected = settings.fiatCurrency === cur;
                const config = SUPPORTED_FIAT[cur];
                return (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => updateSettings({ fiatCurrency: cur })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center ${
                      isSelected
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-[#171a24] text-slate-300 border border-slate-800 hover:bg-[#1f2332]'
                    }`}
                  >
                    <span>{cur}</span>
                    <span className="text-[10px] opacity-80">{config.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language selection */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Language
            </label>
            <div className="p-2.5 bg-[#171a24] border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-white">
                <Languages className="w-4 h-4 text-slate-400" />
                <span>English (US)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* ================= SECURITY (BIOMETRIC AUTHN) ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              Security
            </h3>
          </div>

          <div className="p-3 bg-[#171a24] border border-slate-800/60 rounded-xl flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                Use biometric authentication
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                Use your device&apos;s supported biometric/passkey authentication to protect Merchant X.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleBiometric}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer mt-0.5 ${
                settings.biometricEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.biometricEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {biometricSupported === false && (
            <p className="text-[11px] text-amber-400/90 mt-2 px-1">
              Biometric authentication is not available on this device.
            </p>
          )}

          {biometricError && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{biometricError}</span>
            </div>
          )}
        </div>

        {/* ================= APP INFO & LEGAL ================= */}
        <div className="bg-[#12141c] border border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Outfit']">
              App Information
            </h3>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleShareApp}
              className="w-full p-3 bg-[#171a24] hover:bg-[#1f2332] border border-slate-800/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">
                  Share Merchant X
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {copiedLink ? 'Link copied!' : 'Share POS Link'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="w-full p-3 bg-[#171a24] hover:bg-[#1f2332] border border-slate-800/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white">
                  Privacy Policy
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="w-full p-3 bg-[#171a24] hover:bg-[#1f2332] border border-slate-800/60 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Terms of Service
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* App Version Stamp */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
            <div className="text-xs font-bold text-white font-['Outfit']">
              Merchant X
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Version 1.0.0
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              © 2026 Merchant X
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWalletModal && <WalletConnectModal onClose={() => setShowWalletModal(false)} />}
      {showPrivacyModal && <PrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />}
      {showTermsModal && <TermsOfServiceModal onClose={() => setShowTermsModal(false)} />}
    </div>
  );
};
