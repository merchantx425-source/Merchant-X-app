import React, { useState, useEffect } from 'react';
import { AppSettings, WalletState, FiatCurrency, AppTheme, SubscriptionState, ReceiptTheme } from '../types/merchant';
import { SUPPORTED_FIAT } from '../config/constants';
import { formatAddress } from '../services/blockchainService';
import {
  isBiometricAvailable,
  registerBiometricPasskey,
  verifyBiometricAuth,
  triggerBiometricHaptic,
  getStoredTerminalPin,
  setStoredTerminalPin,
  setBiometricEnabledState,
  hasStoredTerminalPin,
} from '../services/biometricService';
import { getTranslation } from '../config/i18n';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { BiometricModal } from './BiometricModal';
import { VideoTutorialModal } from './Tutorial/VideoTutorialModal';
import { FeedbackModal } from './Feedback/FeedbackModal';
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
  KeyRound,
  CheckCircle2,
  Video,
  MessageSquare,
  HelpCircle,
  Star,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  isStandalone,
  checkForAppUpdates,
  subscribeAppUpdate,
  CURRENT_CLIENT_VERSION,
  AppUpdateInfo,
  getAppUpdateState,
} from '../services/pwaService';
import { AppUpdateNotification } from './AppUpdateNotification';

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
  onLockTerminal?: () => void;
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
  onLockTerminal,
}) => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<{
    available: boolean;
    platformAuthenticator: boolean;
    type: string;
  }>({
    available: true,
    platformAuthenticator: false,
    type: 'fingerprint',
  });
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showBiometricTestModal, setShowBiometricTestModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [terminalPinInput, setTerminalPinInput] = useState(() => getStoredTerminalPin() || '');
  const [savedPinNotice, setSavedPinNotice] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo>(() => getAppUpdateState());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const lang = settings.language;

  useEffect(() => {
    isBiometricAvailable().then((res) => {
      setBiometricInfo(res);
    });
    setAppInstalled(isStandalone());

    const unsubscribe = subscribeAppUpdate((info) => {
      setUpdateInfo(info);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckStatus(null);

    try {
      const res = await checkForAppUpdates(true);
      if (res.hasUpdate) {
        setShowUpdateModal(true);
        setUpdateCheckStatus(`New version v${res.latestVersion} available!`);
      } else {
        setUpdateCheckStatus('Merchant X is up to date (v' + CURRENT_CLIENT_VERSION + ')');
        setTimeout(() => setUpdateCheckStatus(null), 4000);
      }
    } catch {
      setUpdateCheckStatus('Merchant X is up to date (v' + CURRENT_CLIENT_VERSION + ')');
      setTimeout(() => setUpdateCheckStatus(null), 4000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Biometric toggle handler
  const handleToggleBiometric = async () => {
    setBiometricError(null);
    setTestSuccessMessage(null);
    if (!settings.biometricEnabled) {
      try {
        await registerBiometricPasskey(settings.merchantName);
        setBiometricEnabledState(true);
        onUpdateSettings({ biometricEnabled: true });
        setTestSuccessMessage('Biometric fingerprint registered successfully!');
        setTimeout(() => setTestSuccessMessage(null), 4000);
      } catch (err: any) {
        setBiometricError(err.message || 'Failed to enable biometric authentication.');
      }
    } else {
      setBiometricEnabledState(false);
      onUpdateSettings({ biometricEnabled: false });
    }
  };

  // Save Terminal PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = terminalPinInput.trim();
    if (!cleanPin) {
      setStoredTerminalPin('');
      setTerminalPinInput('');
      setSavedPinNotice(true);
      triggerBiometricHaptic('tap');
      setTimeout(() => setSavedPinNotice(false), 3000);
      return;
    }
    setStoredTerminalPin(cleanPin);
    setSavedPinNotice(true);
    triggerBiometricHaptic('success');
    setTimeout(() => setSavedPinNotice(false), 3000);
  };

  // Remove PIN
  const handleClearPin = () => {
    setStoredTerminalPin('');
    setTerminalPinInput('');
    setSavedPinNotice(true);
    triggerBiometricHaptic('tap');
    setTimeout(() => setSavedPinNotice(false), 3000);
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Security & Terminal Lock
          </h2>
          {(settings.biometricEnabled || !!terminalPinInput || !!getStoredTerminalPin()) && onLockTerminal && (
            <button
              type="button"
              onClick={onLockTerminal}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Lock Terminal</span>
            </button>
          )}
        </div>

        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Biometric Toggle */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>{getTranslation(lang, 'biometricAuth')}</span>
                  {settings.biometricEnabled && (
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase rounded">
                      Active ✓
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Touch your phone’s fingerprint sensor or platform authenticator to authorize actions and unlock Merchant X.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleBiometric}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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

          {/* Test Fingerprint Sensor Button */}
          {settings.biometricEnabled && (
            <div className="pt-2 border-t border-zinc-800/60 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowBiometricTestModal(true)}
                  className="flex-1 py-2.5 px-3 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/50 text-purple-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4 text-purple-400" />
                  <span>Test Phone Fingerprint Sensor</span>
                </button>

                {onLockTerminal && (
                  <button
                    type="button"
                    onClick={onLockTerminal}
                    className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Terminal Now</span>
                  </button>
                )}
              </div>

              {testSuccessMessage && (
                <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Backup Terminal Security PIN */}
          <div className="pt-3 border-t border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Security PIN Code</span>
                {hasStoredTerminalPin() && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase rounded">
                    Active ✓
                  </span>
                )}
              </label>
              <span className="text-[10px] text-zinc-500">
                {hasStoredTerminalPin() ? 'PIN Configured' : 'Optional lock code'}
              </span>
            </div>
            <form onSubmit={handleSavePin} className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="Enter 4-8 digit PIN"
                value={terminalPinInput}
                onChange={(e) => setTerminalPinInput(e.target.value)}
                className="flex-1 bg-[#0d0e14] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono tracking-widest"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Save PIN
              </button>
              {hasStoredTerminalPin() && (
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  title="Remove PIN"
                >
                  Clear
                </button>
              )}
            </form>
            {savedPinNotice && (
              <div className="flex items-center justify-between p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {hasStoredTerminalPin()
                      ? '✓ Terminal security PIN saved.'
                      : '✓ Security PIN removed.'}
                  </span>
                </div>
                {hasStoredTerminalPin() && onLockTerminal && (
                  <button
                    type="button"
                    onClick={onLockTerminal}
                    className="underline text-amber-400 font-bold hover:text-amber-300 cursor-pointer text-[10px]"
                  >
                    Lock & Test Now
                  </button>
                )}
              </div>
            )}
          </div>

          {biometricError && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-[11px] text-red-300">
              {biometricError}
            </div>
          )}
        </div>
      </div>

      {/* 8. HELP & TUTORIALS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Help & Tutorial</span>
        </h2>
        <div className="bg-[#14161f] border border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Merchant X Masterclass</span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded">
                    Interactive Walkthrough
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Full step-by-step video tutorial demonstrating POS setup, Verse payments & receipt flow
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Rate Merchant X</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded">
                    5-Star Rating
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Submit your 5-star rating & feedback • View community merchant ratings
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* 9. JOIN US ON X (COMMUNITY & SOCIALS) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-amber-400" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Join Us on X</span>
        </h2>
        <div className="bg-[#14161f] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 bg-gradient-to-br from-[#161824] via-[#12141f] to-[#1c1810]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black border border-zinc-700 flex items-center justify-center text-white shadow-md">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Merchant X on X</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/40">
                    Official
                  </span>
                </div>
                <div className="text-xs font-mono text-amber-400 font-semibold">
                  @MerchantX122
                </div>
              </div>
            </div>
            <a
              href="https://x.com/MerchantX122"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Follow</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Follow the official <strong className="text-white">@MerchantX122</strong> account on X (Twitter) for product updates, non-custodial crypto POS releases, ecosystem partnerships, and announcements.
          </p>

          <a
            href="https://x.com/MerchantX122"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-zinc-200" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Open https://x.com/MerchantX122</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* 10. APP & ABOUT */}
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

          {/* Check for Updates & Version */}
          <div className="w-full p-4 flex items-center justify-between hover:bg-[#1a1d28] transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>App Version & Updates</span>
                  <span className="px-1.5 py-0.2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono font-bold rounded">
                    v{CURRENT_CLIENT_VERSION}
                  </span>
                  {updateInfo.hasUpdate && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase rounded animate-pulse">
                      Update Ready
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  {updateCheckStatus ? (
                    <span className={updateInfo.hasUpdate ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                      {updateCheckStatus}
                    </span>
                  ) : updateInfo.hasUpdate ? (
                    <span className="text-amber-400 font-medium">New version v{updateInfo.latestVersion} available</span>
                  ) : (
                    'Automatic background update detection active'
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {updateInfo.hasUpdate ? (
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Update
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={isCheckingUpdate}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking...' : 'Check'}</span>
                </button>
              )}
            </div>
          </div>

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
        <div className="text-xs text-zinc-400 font-mono flex items-center justify-center gap-2">
          <span>Version {CURRENT_CLIENT_VERSION}</span>
          <span className="text-zinc-600">•</span>
          <button
            type="button"
            onClick={handleCheckForUpdates}
            className="text-amber-400 hover:text-amber-300 font-sans hover:underline cursor-pointer"
          >
            Check updates
          </button>
        </div>
        <div className="text-xs text-zinc-600">© 2026 Merchant X • Non-Custodial POS</div>
      </div>

      {/* Modals */}
      <AppUpdateNotification
        forceOpenModal={showUpdateModal}
        onCloseModal={() => setShowUpdateModal(false)}
      />
      <VideoTutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsOfServiceModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <BiometricModal
        isOpen={showBiometricTestModal}
        onClose={() => setShowBiometricTestModal(false)}
        onSuccess={() => {
          setShowBiometricTestModal(false);
          setTestSuccessMessage('Fingerprint sensor test successful! Biometric authentication is working perfectly.');
          setTimeout(() => setTestSuccessMessage(null), 5000);
        }}
        title="Test Fingerprint Sensor"
        subtitle="Touch your phone’s fingerprint sensor to test authentication"
      />
    </div>
  );
};
