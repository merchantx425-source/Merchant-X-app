import React, { useState, useEffect } from 'react';
import { MerchantXLogo } from './MerchantXLogo';
import {
  isStandalone,
  isIOS,
  isMobileDevice,
  isInstallDismissed,
  setInstallDismissed,
  subscribeInstallState,
  triggerNativeInstall,
  canPromptNativeInstall,
} from '../services/pwaService';
import { Download, X, Share, PlusSquare, Smartphone, Zap, CheckCircle2 } from 'lucide-react';

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // If running already in standalone mode, never auto-open
    const standalone = isStandalone();
    setIsInstalled(standalone);

    if (standalone) {
      if (forceOpen) {
        setIsOpen(true);
      }
      return;
    }

    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Auto-prompt logic for mobile browsers
    const dismissed = isInstallDismissed();
    const isMobile = isMobileDevice();
    const isApple = isIOS();

    // Check if dismissed
    if (!dismissed && (isMobile || canPromptNativeInstall() || isApple)) {
      // Small 1.5s delay after initial load so UI settles smoothly
      const timer = setTimeout(() => {
        if (!isStandalone() && !isInstallDismissed()) {
          setIsOpen(true);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }

    // Subscribe to native beforeinstallprompt availability
    const unsubscribe = subscribeInstallState((canInstall) => {
      if (canInstall && !isInstallDismissed() && !isStandalone()) {
        setIsOpen(true);
      }
    });

    return () => unsubscribe();
  }, [forceOpen]);

  // Handle Cancel / Dismiss
  const handleCancel = () => {
    setIsOpen(false);
    setShowIOSInstructions(false);
    setInstallDismissed(true);
    if (onClose) onClose();
  };

  // Handle Install Click
  const handleInstallClick = async () => {
    const isApple = isIOS();

    if (isApple && !canPromptNativeInstall()) {
      // iOS Safari manual flow
      setShowIOSInstructions(true);
      return;
    }

    setIsInstalling(true);
    try {
      const outcome = await triggerNativeInstall();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setInstallDismissed(true);
        setTimeout(() => {
          setIsOpen(false);
          if (onClose) onClose();
        }, 2000);
      } else if (outcome === 'dismissed') {
        setInstallDismissed(true);
        setIsOpen(false);
        if (onClose) onClose();
      } else {
        // Fallback for browsers without native prompt
        setShowIOSInstructions(true);
      }
    } catch {
      setShowIOSInstructions(true);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Dialog Card */}
      <div className="w-full max-w-md bg-[#0f111a] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Glow Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isInstalled ? (
          /* Already Installed View */
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-display text-white">Merchant X Is Installed</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              You are currently running Merchant X as a standalone Web App on this device.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : installSuccess ? (
          /* Success Screen */
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-display text-white">Installing Merchant X...</h3>
            <p className="text-xs text-zinc-400">
              Merchant X is being added to your Home Screen. You can launch it anytime.
            </p>
          </div>
        ) : showIOSInstructions ? (
          /* iOS Safari / Manual Step-by-Step Instructions */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <MerchantXLogo size="xs" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">
                  Add Merchant X to Home Screen
                </h3>
                <p className="text-xs text-zinc-400">Install via Safari in 2 simple steps:</p>
              </div>
            </div>

            <div className="space-y-2.5 bg-[#141724] border border-zinc-800/80 rounded-2xl p-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-zinc-300">
                  Tap the <strong className="text-white font-semibold">Share</strong> button{' '}
                  <Share className="w-3.5 h-3.5 inline text-amber-400 mx-1 align-sub" /> in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1 border-t border-zinc-800/60">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-zinc-300">
                  Scroll down and tap{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400" /> Add to Home Screen
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        ) : (
          /* Standard Install Prompt (Title, Subtitle, Install, Cancel) */
          <div className="space-y-4">
            {/* Header with App Badge */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <MerchantXLogo size="sm" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-white tracking-tight leading-snug">
                  Install Merchant X
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Install Merchant X on your phone for a faster, app-like experience.
                </p>
              </div>
            </div>

            {/* Quick App Highlights */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-300">
              <div className="flex items-center gap-2 p-2 bg-[#141724] border border-zinc-800/80 rounded-xl">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Instant launch & speed</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#141724] border border-zinc-800/80 rounded-xl">
                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Full-screen POS terminal</span>
              </div>
            </div>

            {/* Action Buttons: Install & Cancel */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl border border-zinc-700/60 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Installing...' : 'Install'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
