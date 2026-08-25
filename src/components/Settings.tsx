import React, { useState, useEffect } from 'react';
import { AppSettings, WalletState, FiatCurrency, AppTheme, SubscriptionState } from '../types/merchant';
import { SUPPORTED_FIAT } from '../config/constants';
import { formatAddress } from '../services/blockchainService';
import { isBiometricAvailable, registerBiometricPasskey } from '../services/biometricService';
import { getTranslation } from '../config/i18n';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { MerchantXLogo } from './MerchantXLogo';
import {
  Wallet,
  Receipt,
  FileSpreadsheet,
  Sun,
  Moon,
  Laptop,
  Fingerprint,
  Share2,
  Shield,
  FileText,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  walletState: WalletState;
  onOpenWalletModal: () => void;
  onDisconnectWallet: () => void;
  onOpenHistory: () => void;
  onExportTransactions: () => void;
  onOpenSubscription?: () => void;
  subscriptionState?: SubscriptionState;
  isPro?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  walletState,
  onOpenWalletModal,
  onDisconnectWallet,
  onOpenHistory,
  onExportTransactions,
  onOpenSubscription,
  subscriptionState,
  isPro = false,
}) => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  const lang = settings.language;

  useEffect(() => {
    isBiometricAvailable().then((res) => setBiometricSupported(res));
  }, []);

  // Biometric toggle handler
  const handleToggleBiometric = async () => {
    setBiometricError(null);
    if (!settings.biometricEnabled) {
      try {
        await registerBiometricPasskey(settings.merchantName);
        onUpdateSettings({ biometricEnabled: true });
      } catch (err: any) {
        setBiometricError(err.message || 'Failed to enable biometric authentication.');
      }
    } else {
      onUpdateSettings({ biometricEnabled: false });
    }
  };

  // Share Application
  const handleShareApp = async () => {
    const shareData = {
      title: 'Merchant X — Crypto Payment POS',
      text: 'Accept VERSE, POL, USDT, ETH, and BTC crypto payments with Merchant X terminal.',
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
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-24 px-3 sm:px-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          {getTranslation(lang, 'settings')}
        </h1>
        <p className="text-xs text-zinc-400">Terminal preferences, security, and wallet routing</p>
      </div>

      {/* 1. WALLET / ACCOUNT */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Account / Wallet
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Connected Wallet</div>
                <div className="font-semibold text-sm text-white">
                  {walletState.isConnected ? walletState.walletProvider || 'Active Terminal' : getTranslation(lang, 'offline')}
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                walletState.isConnected
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {walletState.isConnected ? getTranslation(lang, 'connected') : getTranslation(lang, 'offline')}
            </span>
          </div>

          {/* Addresses Preview */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/60 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">EVM Settlement Address:</span>
              <span className="font-mono text-amber-300">
                {walletState.evmAddress ? formatAddress(walletState.evmAddress, 6) : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Bitcoin Address:</span>
              <span className="font-mono text-amber-400">
                {walletState.btcAddress ? formatAddress(walletState.btcAddress, 6) : 'Not configured'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenWalletModal}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            >
              {walletState.isConnected ? getTranslation(lang, 'reconnect') : getTranslation(lang, 'connectWallet')}
            </button>
            {walletState.isConnected && (
              <button
                type="button"
                onClick={onDisconnectWallet}
                className="px-4 py-2.5 bg-red-950/30 hover:bg-red-900/40 border border-red-800/50 text-red-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {getTranslation(lang, 'disconnect')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUBSCRIPTION PLAN */}
      {onOpenSubscription && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 flex items-center justify-between">
            <span>Subscription Plan</span>
            {isPro ? (
              <span className="text-[10px] text-amber-400 font-bold uppercase">Pro Tier Active</span>
            ) : (
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Free Tier</span>
            )}
          </h2>
          <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
            <button
              type="button"
              onClick={onOpenSubscription}
              className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{isPro ? 'Merchant X Pro Plan' : 'Merchant X Free Plan'}</span>
                    {isPro && (
                      <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase rounded">
                        PRO ✓
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {isPro
                      ? `Unlimited volume • Expires ${
                          subscriptionState?.proExpiresAt
                            ? new Date(subscriptionState.proExpiresAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'in 30 days'
                        }`
                      : '10 tx/mo limit • Upgrade to Pro for $10/month'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      )}

      {/* 3. TRANSACTIONS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Transactions
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">{getTranslation(lang, 'txHistory')}</div>
                <div className="text-xs text-zinc-400">{getTranslation(lang, 'txHistorySub')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={onExportTransactions}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Export Statement (PDF / CSV)</div>
                <div className="text-xs text-zinc-400">Download formatted accounting statements & reports</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* 3. APPEARANCE */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Appearance
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="text-xs text-zinc-300 font-semibold">{getTranslation(lang, 'theme')}</div>
          <div className="grid grid-cols-3 gap-2">
            {(['dark', 'light', 'system'] as AppTheme[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateSettings({ theme: mode })}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold capitalize transition-all cursor-pointer ${
                  settings.theme === mode
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                    : 'bg-[#0d0e14] border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {mode === 'dark' ? (
                  <Moon className="w-4 h-4" />
                ) : mode === 'light' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Laptop className="w-4 h-4" />
                )}
                <span>{getTranslation(lang, mode)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. PREFERENCES & CURRENCY */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Preferences
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-300 font-semibold mb-1.5">
              {getTranslation(lang, 'displayCurrency')}
            </label>
            <select
              value={settings.fiatCurrency}
              onChange={(e) => onUpdateSettings({ fiatCurrency: e.target.value as FiatCurrency })}
              className="w-full bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {Object.values(SUPPORTED_FIAT).map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {cur.symbol} {cur.code} — {cur.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-300 font-semibold mb-1.5">
              {getTranslation(lang, 'language')}
            </label>
            <select
              value={settings.language}
              onChange={(e) => onUpdateSettings({ language: e.target.value })}
              className="w-full bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="en">English (US / Global)</option>
              <option value="fr">Français (French)</option>
              <option value="es">Español (Spanish)</option>
              <option value="pt">Português (Portuguese)</option>
            </select>
          </div>

          {/* Merchant Display Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/70">
            <div>
              <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                {getTranslation(lang, 'merchantName')}
              </label>
              <input
                type="text"
                value={settings.merchantName}
                onChange={(e) => onUpdateSettings({ merchantName: e.target.value })}
                className="w-full bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                {getTranslation(lang, 'storeLocation')}
              </label>
              <input
                type="text"
                value={settings.merchantLocation}
                onChange={(e) => onUpdateSettings({ merchantLocation: e.target.value })}
                className="w-full bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECURITY & BIOMETRICS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Security
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{getTranslation(lang, 'biometricAuth')}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {getTranslation(lang, 'biometricSub')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={biometricSupported === false}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                settings.biometricEnabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {biometricSupported === false && (
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Biometric authentication is not available on this device.</span>
            </div>
          )}

          {biometricError && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-[11px] text-red-300">
              {biometricError}
            </div>
          )}
        </div>
      </div>

      {/* 6. APP & ABOUT */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          App
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          <button
            type="button"
            onClick={handleShareApp}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">{getTranslation(lang, 'shareApp')}</div>
                <div className="text-xs text-zinc-400">
                  {copiedShare ? 'Link copied to clipboard!' : getTranslation(lang, 'shareSub')}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">{getTranslation(lang, 'privacyPolicy')}</div>
                <div className="text-xs text-zinc-400">{getTranslation(lang, 'privacySub')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">{getTranslation(lang, 'termsOfService')}</div>
                <div className="text-xs text-zinc-400">{getTranslation(lang, 'termsSub')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* 7. APP VERSION & BRANDING */}
      <div className="pt-6 pb-2 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <MerchantXLogo size="xs" />
          <span className="font-extrabold font-display text-white text-sm">Merchant X</span>
        </div>
        <div className="text-xs text-zinc-500 font-mono">Version 1.0.0</div>
        <div className="text-xs text-zinc-600">© 2026 Merchant X • All Rights Reserved</div>
      </div>

      {/* Modals */}
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsOfServiceModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};
