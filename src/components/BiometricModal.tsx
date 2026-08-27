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
  Delete,
} from 'lucide-react';
import {
  verifyBiometricAuth,
  triggerBiometricHaptic,
  verifyTerminalPin,
  getStoredTerminalPin,
  isBiometricAvailable,
  isBiometricEnabledState,
  hasStoredTerminalPin,
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
  title,
  subtitle,
  isLockScreen = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usePinFallback, setUsePinFallback] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [deviceBiometricType, setDeviceBiometricType] = useState<string>('fingerprint');

  const isBiometricActive = isBiometricEnabledState();
  const hasPinConfigured = hasStoredTerminalPin();

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage(null);
      setEnteredPin('');

      const biometricActive = isBiometricEnabledState();
      const hasPin = hasStoredTerminalPin();

      // If biometric is active: start in fingerprint view
      // If biometric is NOT active but PIN is set: start directly in PIN view
      const startInPin = !biometricActive && hasPin;
      setUsePinFallback(startInPin);

      isBiometricAvailable().then((res) => {
        setDeviceBiometricType(res.type);
      });

      // If in biometric mode, auto-trigger native fingerprint prompt
      if (!startInPin && biometricActive) {
        const timer = setTimeout(() => {
          handleTriggerBiometric();
        }, 350);
        return () => clearTimeout(timer);
      }
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
      setErrorMessage(err.message || 'Fingerprint verification failed. Please try again or enter your PIN.');
    }
  }, [onSuccess]);

  // Touch screen fingerprint target directly
  const handleTouchSensorTarget = () => {
    triggerBiometricHaptic('tap');
    handleTriggerBiometric();
  };

  // Validate entered PIN
  const checkPin = useCallback(
    (pin: string) => {
      if (!pin) return;
      if (verifyTerminalPin(pin)) {
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
    },
    [onSuccess]
  );

  // Keypad button press
  const handleKeypadPress = (val: string) => {
    triggerBiometricHaptic('tap');
    if (val === 'backspace') {
      setEnteredPin((prev) => prev.slice(0, -1));
      return;
    }
    if (val === 'clear') {
      setEnteredPin('');
      return;
    }
    if (enteredPin.length < 8) {
      const nextPin = enteredPin + val;
      setEnteredPin(nextPin);
      const stored = getStoredTerminalPin();
      // Auto-validate if matches stored length
      if (stored && nextPin.length === stored.length) {
        checkPin(nextPin);
      }
    }
  };

  // Form submit (physical keyboard Enter)
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkPin(enteredPin);
  };

  const displayTitle =
    title ||
    (isLockScreen
      ? 'Merchant X Terminal Locked'
      : usePinFallback
      ? 'Security PIN Required'
      : 'Biometric Authentication');

  const displaySubtitle =
    subtitle ||
    (usePinFallback
      ? 'Enter your terminal security PIN to proceed'
      : 'Touch your phone’s fingerprint sensor to proceed');

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isLockScreen ? 'bg-black/95 backdrop-blur-xl' : 'bg-black/80 backdrop-blur-md'
      }`}
    >
      <div className="relative w-full max-w-sm bg-[#12141d] border-2 border-purple-900 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-purple-950/60 text-center animate-in fade-in zoom-in-95 duration-200">
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
        <div className="flex justify-center mb-2">
          <MerchantXLogo size="xs" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold font-display text-white tracking-tight">{displayTitle}</h3>
        <p className="text-xs text-zinc-400 mt-0.5 mb-4 px-2">{displaySubtitle}</p>

        {!usePinFallback ? (
          /* Biometric Fingerprint Interface */
          <div className="space-y-4">
            {/* Interactive Fingerprint Target with Scanning Glow */}
            <div className="flex justify-center my-2">
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
                    : 'bg-[#181a26] border-2 border-purple-900 hover:border-amber-400 hover:bg-amber-500/10 shadow-lg'
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
            <div className="min-h-[22px]">
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
                  Touch sensor or tap button below to unlock
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
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
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter Security PIN Instead</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Backup PIN Code Screen with On-Screen Keypad */
          <form onSubmit={handlePinSubmit} className="space-y-3">
            {/* Masked PIN Display */}
            <div className="p-3 bg-[#0d0e14] border-2 border-purple-900 rounded-2xl flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">
                Terminal Passcode PIN
              </div>
              <div className="flex items-center gap-2.5 h-8">
                {[0, 1, 2, 3].map((idx) => {
                  const hasChar = enteredPin.length > idx;
                  return (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        hasChar
                          ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                          : 'bg-zinc-800 border border-zinc-700'
                      }`}
                    />
                  );
                })}
                {enteredPin.length > 4 && (
                  <span className="text-xs text-amber-400 font-mono ml-1 font-bold">
                    +{enteredPin.length - 4}
                  </span>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="text-xs text-red-300 font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Touch Keypad for PIN with Dark Purple Edges */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-10 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 border-purple-900 rounded-xl text-lg font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="h-10 bg-[#141520] hover:bg-[#1f2130] text-zinc-400 active:text-white border-2 border-purple-900 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-10 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 border-purple-900 rounded-xl text-lg font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                className="h-10 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 border-purple-900 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-400 shadow-sm shadow-purple-950/40 cursor-pointer"
                title="Delete"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={!enteredPin}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
              >
                Unlock Terminal
              </button>

              {isBiometricActive && (
                <button
                  type="button"
                  onClick={() => {
                    setUsePinFallback(false);
                    setErrorMessage(null);
                    handleTriggerBiometric();
                  }}
                  className="w-full py-2 text-zinc-400 hover:text-amber-400 text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-semibold"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Use Phone Fingerprint Sensor</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
