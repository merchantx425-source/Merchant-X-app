import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  Lock,
  X,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import {
  verifyBiometricAuth,
  triggerBiometricHaptic,
  verifyTerminalPin,
  getStoredTerminalPin,
  isBiometricAvailable,
} from '../services/biometricService';
import { MerchantXLogo } from './MerchantXLogo';

interface BiometricModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  isLockScreen?: boolean; // If true, cannot be dismissed without auth or PIN
}

export const BiometricModal: React.FC<BiometricModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Biometric Authentication',
  subtitle = 'Touch your phone’s fingerprint sensor to proceed',
  isLockScreen = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usePinFallback, setUsePinFallback] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [deviceBiometricType, setDeviceBiometricType] = useState<string>('fingerprint');
  const hasPinConfigured = !!getStoredTerminalPin();

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage(null);
      setUsePinFallback(false);
      setEnteredPin('');

      isBiometricAvailable().then((res) => {
        setDeviceBiometricType(res.type);
      });

      // Auto-trigger native fingerprint sensor prompt when opened
      const timer = setTimeout(() => {
        handleTriggerBiometric();
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trigger Phone Biometric WebAuthn
  const handleTriggerBiometric = useCallback(async () => {
    setStatus('scanning');
    setErrorMessage(null);
    triggerBiometricHaptic('scan');

    try {
      const result = await verifyBiometricAuth();
      if (result.success) {
        setStatus('success');
        triggerBiometricHaptic('success');
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (err: any) {
      setStatus('error');
      triggerBiometricHaptic('error');
      setErrorMessage(err.message || 'Fingerprint verification failed. Please try again.');
    }
  }, [onSuccess]);

  // Touch screen fingerprint target directly
  const handleTouchSensorTarget = () => {
    triggerBiometricHaptic('tap');
    handleTriggerBiometric();
  };

  // PIN submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPin) return;

    if (verifyTerminalPin(enteredPin)) {
      setStatus('success');
      triggerBiometricHaptic('success');
      setTimeout(() => {
        onSuccess();
      }, 400);
    } else {
      triggerBiometricHaptic('error');
      setErrorMessage('Incorrect PIN. Please try again.');
      setEnteredPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isLockScreen ? 'bg-black/95 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-md'
      }`}
    >
      <div className="relative w-full max-w-sm bg-[#12141d] border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-purple-950/40 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button (only if not full terminal lock) */}
        {!isLockScreen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Icon */}
        <div className="flex justify-center mb-3">
          <MerchantXLogo size="xs" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold font-display text-white tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-6 px-2">{subtitle}</p>

        {!usePinFallback ? (
          /* Biometric Fingerprint Interface */
          <div className="space-y-6">
            {/* Interactive Fingerprint Target with Scanning Glow */}
            <div className="flex justify-center my-4">
              <button
                type="button"
                onClick={handleTouchSensorTarget}
                className={`relative w-28 h-28 rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                  status === 'success'
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                    : status === 'scanning'
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-xl shadow-amber-500/30 ring-4 ring-amber-500/30 animate-pulse'
                    : status === 'error'
                    ? 'bg-red-500/20 border-2 border-red-400 shadow-lg shadow-red-500/30'
                    : 'bg-[#181a26] border-2 border-zinc-700 hover:border-amber-400 hover:bg-amber-500/10 shadow-lg'
                }`}
                title="Touch fingerprint sensor"
              >
                {/* Visual scan beam animation */}
                {status === 'scanning' && (
                  <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-bounce rounded-full top-2" />
                )}

                {status === 'success' ? (
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-in zoom-in-50 duration-300" />
                ) : (
                  <Fingerprint
                    className={`w-14 h-14 transition-colors ${
                      status === 'scanning'
                        ? 'text-amber-400'
                        : status === 'error'
                        ? 'text-red-400'
                        : 'text-amber-400/90'
                    }`}
                  />
                )}

                <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-zinc-400">
                  {status === 'success'
                    ? 'Verified'
                    : status === 'scanning'
                    ? 'Scanning...'
                    : 'Touch Sensor'}
                </span>
              </button>
            </div>

            {/* Status Message */}
            <div className="min-h-[24px]">
              {status === 'scanning' && (
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium animate-pulse">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Touch your phone’s fingerprint sensor now...</span>
                </div>
              )}
              {status === 'success' && (
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Fingerprint Verified Successfully!</span>
                </div>
              )}
              {status === 'error' && errorMessage && (
                <div className="text-xs text-red-300 font-medium px-2 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {status === 'idle' && (
                <div className="text-xs text-zinc-400">
                  Tap the fingerprint icon or touch your device sensor
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleTouchSensorTarget}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Touch Phone Fingerprint Sensor</span>
              </button>

              {hasPinConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setUsePinFallback(true);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Use Backup PIN Code</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Backup PIN Code Screen */
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs text-zinc-300 font-semibold">
                Enter Terminal Security PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full bg-[#0d0e14] border border-zinc-700 rounded-2xl py-3 text-center text-xl font-mono text-white tracking-widest focus:outline-none focus:border-amber-500"
              />
            </div>

            {errorMessage && (
              <div className="text-xs text-red-300 font-medium">{errorMessage}</div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Unlock Terminal
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsePinFallback(false);
                  setErrorMessage(null);
                }}
                className="w-full py-2 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
              >
                Back to Fingerprint Sensor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
