import React, { useState, useEffect } from 'react';
import { AppSettings, WalletState, FiatCurrency, AppTheme, SubscriptionState, ReceiptTheme } from '../types/merchant';
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
  Palette,
  Award,
  Download,
  Smartphone,
  Lock,
} from 'lucide-react';
import { isStandalone } from '../services/pwaService';

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
  onOpenInstallPrompt?: () => void;
}

const RECEIPT_THEMES: { id: ReceiptTheme; name: string; previewColor: string }[] = [
  { id: 'gold', name: 'Luxury Gold', previewColor: 'from-amber-400 to-amber-600' },
  { id: 'neon', name: 'Cyber Neon', previewColor: 'from-cyan-400 to-fuchsia-500' },
  { id: 'emerald', name: 'Emerald Minimal', previewColor: 'from-emerald-400 to-teal-500' },
  { id: 'obsidian', name: 'Obsidian Onyx', previewColor: 'from-zinc-400 to-zinc-700' },
  { id: 'paper', name: 'Classic POS Paper', previewColor: 'from-amber-700 to-zinc-600' },
  { id: 'verse', name: 'Verse Royal Violet', previewColor: 'from-[#00d2ff] via-[#8a2be2] to-[#ff007a]' },
];

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
  onOpenInstallPrompt,
}) => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);

  const lang = settings.language;

  useEffect(() => {
    isBiometricAvailable().then((res) => setBiometricSupported(res));
    setAppInstalled(isStandalone());
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
      text: 'Accept VERSE, POL, USDC, USDT, ETH, and BTC crypto payments with Merchant X terminal.',
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
        <p className="text-xs text-zinc-400">Terminal preferences, security, and receipt branding</p>
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

      {/* 3. RECEIPT & BACKGROUND CUSTOMIZATION (PRO EXCLUSIVE) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Receipt & Background Customization</span>
          </span>
          {isPro ? (
            <span className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>Pro Unlocked ✓</span>
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Pro Only</span>
            </span>
          )}
        </h2>

        {isPro ? (
          <div className="bg-[#14161f] border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            {/* Theme Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-200 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Receipt Background Theme</span>
                </label>
                <span className="text-[10px] text-amber-300 font-mono font-semibold">6 Themes Available</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RECEIPT_THEMES.map((theme) => {
                  const isSelected = (settings.receiptTheme || 'gold') === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdateSettings({ receiptTheme: theme.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 text-white font-bold shadow-sm'
                          : 'bg-[#0d0e14] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <div className={`h-2 rounded-full mb-1.5 bg-gradient-to-r ${theme.previewColor}`} />
                      <span className="text-xs">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Receipt Note / Footer Message */}
            <div className="pt-2 border-t border-zinc-800/60">
              <label className="block text-xs text-zinc-300 font-semibold mb-1">
                Custom Receipt Note (Printed on Receipts)
              </label>
              <input
                type="text"
                placeholder="e.g. Thank you for your business! Follow @store"
                value={settings.customReceiptNote || ''}
                onChange={(e) => onUpdateSettings({ customReceiptNote: e.target.value })}
                className="w-full bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        ) : (
          /* Locked State in Free Mode */
          <div className="bg-[#12141d] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Custom Themes & Receipt Branding</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-full uppercase">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Receipt background themes (Luxury Gold, Cyber Neon, Emerald Minimal, Verse Royal, Obsidian) and custom footer messages are available exclusively in <strong className="text-amber-300 font-bold">Pro Mode</strong>.
                </p>
              </div>
            </div>

            {/* Preview blurred badges */}
            <div className="grid grid-cols-3 gap-2 opacity-40 pointer-events-none py-1">
              {RECEIPT_THEMES.slice(0, 3).map((theme) => (
                <div key={theme.id} className="p-2 rounded-lg bg-[#0d0e14] border border-zinc-800 text-[11px] text-zinc-400">
                  <div className={`h-1.5 rounded-full mb-1 bg-gradient-to-r ${theme.previewColor}`} />
                  <span className="truncate block">{theme.name}</span>
                </div>
              ))}
            </div>

            {onOpenSubscription && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Unlock Customization with Pro ($10)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. TRANSACTIONS & EXPORT */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          Transactions & Reports
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

      {/* 5. APPEARANCE */}
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

      {/* 6. PREFERENCES & CURRENCY */}
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

      {/* 7. SECURITY & BIOMETRICS */}
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

      {/* 8. APP & ABOUT */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
          App
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {/* PWA Install Button */}
          {onOpenInstallPrompt && (
            <button
              type="button"
              onClick={onOpenInstallPrompt}
              className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                {appInstalled ? (
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Download className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{appInstalled ? 'Merchant X App Installed' : 'Install Merchant X App'}</span>
                    {appInstalled && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase rounded">
                        Installed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {appInstalled
                      ? 'Running in standalone mobile application mode'
                      : 'Install to your Home Screen for faster offline & full-screen POS'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          )}

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

      {/* 9. APP VERSION & BRANDING */}
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
