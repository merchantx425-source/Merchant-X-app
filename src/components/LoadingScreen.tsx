import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MerchantXLogo } from './MerchantXLogo';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080b] overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-amber-500/10 via-purple-900/20 to-blue-600/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl animate-pulse-glow" />
      </div>

      {/* Center Logo & Title Animation */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <MerchantXLogo size="hero" glow animated />
        </motion.div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display">
            Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">X</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-medium mt-2">
            Crypto Payment POS
          </p>
        </motion.div>

        {/* Subtle loading bar indicator */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '140px', opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.4, ease: 'easeInOut' }}
          className="h-1 bg-gradient-to-r from-amber-500/30 via-amber-400 to-blue-500/40 rounded-full mt-8 overflow-hidden"
        >
          <div className="h-full w-1/3 bg-amber-200 animate-shimmer rounded-full" />
        </motion.div>
      </div>

      {/* Footer system status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="absolute bottom-8 text-center text-[11px] text-zinc-600 font-mono tracking-wider"
      >
        INITIALIZING SECURE TERMINAL v1.0
      </motion.div>
    </motion.div>
  );
};
