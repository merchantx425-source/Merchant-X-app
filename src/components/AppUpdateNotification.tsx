import React, { useState, useEffect } from 'react';
import {
  subscribeAppUpdate,
  applyAppUpdate,
  dismissUpdate,
  isUpdateDismissed,
  AppUpdateInfo,
  getAppUpdateState,
  isStandalone,
} from '../services/pwaService';
import { MerchantXLogo } from './MerchantXLogo';
import {
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  Zap,
  ArrowRight,
  Smartphone,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface AppUpdateNotificationProps {
  forceOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const AppUpdateNotification: React.FC<AppUpdateNotificationProps> = ({
  forceOpenModal = false,
  onCloseModal,
}) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo>(() => getAppUpdateState());
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<'idle' | 'clearing' | 'reloading'>('idle');

  useEffect(() => {
    const unsubscribe = subscribeAppUpdate((info) => {
      setUpdateInfo(info);

      if (info.hasUpdate) {
        // If not dismissed for this version, show floating banner
        if (!isUpdateDismissed(info.latestVersion)) {
          setShowBanner(true);
        }
      } else {
        setShowBanner(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (forceOpenModal) {
      setShowModal(true);
    }
  }, [forceOpenModal]);

  const handleDismissBanner = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowBanner(false);
    dismissUpdate(updateInfo.latestVersion);
  };

  const handleOpenDetails = () => {
    setShowBanner(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onCloseModal) onCloseModal();
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    setUpdateStep('clearing');

    try {
      setTimeout(() => {
        setUpdateStep('reloading');
      }, 500);

      await applyAppUpdate();
    } catch {
      window.location.reload();
    }
  };

  const isPhoneApp = isStandalone();

  return (
    <>
      {/* 1. Floating Update Banner (Pulsing at top/bottom of screen) */}
      {showBanner && updateInfo.hasUpdate && (
        <div className="fixed top-12 sm:top-14 inset-x-0 z-40 px-3 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="max-w-md mx-auto pointer-events-auto bg-[#10131d]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-3 text-left">
            <div
              onClick={handleOpenDetails}
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wide text-white uppercase group-hover:text-amber-400 transition-colors">
                    New Update Ready
                  </span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded-md border border-amber-500/30">
                    v{updateInfo.latestVersion}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {isPhoneApp ? 'New mobile features & speed improvements' : 'Click to update and refresh app'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Updating...' : 'Update'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismissBanner}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Detailed Update Modal / Sheet */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0f111a] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Glow Accent */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button Top-Right */}
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isUpdating}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {isUpdating ? (
              /* Updating Progress State */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse shadow-lg">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-display text-white">
                    Updating Merchant X...
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {updateStep === 'clearing'
                      ? 'Applying latest service worker & cache updates...'
                      : 'Restarting terminal with newest release...'}
                  </p>
                </div>
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full animate-pulse w-full" />
                </div>
              </div>
            ) : (
              /* Update Details Screen */
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                    <MerchantXLogo size="sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold font-display text-white">
                        App Update Available
                      </h3>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-extrabold rounded-md border border-amber-500/40">
                        v{updateInfo.latestVersion}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      A newer version of Merchant X is ready for your device.
                    </p>
                  </div>
                </div>

                {/* Device Standalone Mode Badge */}
                {isPhoneApp && (
                  <div className="flex items-center gap-2 p-2.5 bg-[#141824] border border-zinc-800 rounded-xl text-xs text-zinc-300">
                    <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Installed Mobile PWA detected. Tapping update will refresh your installed app instantly.
                    </span>
                  </div>
                )}

                {/* Release Notes / Highlights */}
                <div className="bg-[#141620] border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>What’s New in Version {updateInfo.latestVersion}:</span>
                  </div>

                  <ul className="space-y-2 text-xs text-zinc-300">
                    {updateInfo.releaseNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Security and Integrity Notice */}
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 px-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Non-custodial cryptographic keys and settings remain safe and local.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl border border-zinc-700/60 transition-all cursor-pointer text-center"
                  >
                    Later
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyUpdate}
                    disabled={isUpdating}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Update App Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
