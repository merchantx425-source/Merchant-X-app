import React from 'react';
import { MerchantXLogo } from '../MerchantXLogo';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

interface MerchantXPresenterProps {
  isPlaying: boolean;
  isMuted: boolean;
}

export const MerchantXPresenter: React.FC<MerchantXPresenterProps> = ({ isPlaying, isMuted }) => {
  const isSpeaking = isPlaying && !isMuted;

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative group">
        {/* Presenter Box with Golden Studio Glow */}
        <div
          className={`w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-b from-[#181b29] via-[#0f121d] to-[#090b12] border-2 transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ${
            isSpeaking
              ? 'border-amber-400/80 shadow-amber-500/20 ring-4 ring-amber-500/20'
              : 'border-zinc-800 ring-1 ring-white/5'
          }`}
        >
          {/* Subtle Ambient Studio Light Backdrop */}
          <div
            className={`absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-transparent to-amber-400/10 pointer-events-none transition-opacity duration-300 ${
              isSpeaking ? 'opacity-100' : 'opacity-40'
            }`}
          />

          {/* Central Prominent Merchant X Logo */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2">
            <div
              className={`transform transition-transform duration-300 ${
                isSpeaking ? 'scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'scale-100'
              }`}
            >
              <MerchantXLogo size="lg" />
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-amber-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 font-display">
                MERCHANT <span className="text-white">X</span>
              </span>
            </div>
          </div>

          {/* Dynamic Audio Visualizer Bar at the bottom of the logo card when speaking */}
          {isSpeaking ? (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-end gap-1 h-3 z-10 px-2 py-0.5 bg-black/60 rounded-full border border-amber-500/30">
              <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2.5" />
              <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
              <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.35s_ease-in-out_infinite] h-1.5" />
              <span className="w-1 bg-amber-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2.5" />
            </div>
          ) : (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 px-2 py-0.5 bg-black/40 rounded-full border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span className="text-[9px] text-zinc-500 font-mono">STANDBY</span>
            </div>
          )}

          {/* Live Status Indicator in Top-Right Corner */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 z-10">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSpeaking ? 'bg-emerald-400 animate-pulse' : isPlaying ? 'bg-amber-400' : 'bg-zinc-500'
              }`}
            />
            <span className="text-[9px] font-mono text-zinc-400">
              {isSpeaking ? 'VOICE' : isMuted ? 'MUTED' : 'READY'}
            </span>
          </div>
        </div>

        {/* Presenter Box Label */}
        <div className="mt-2 text-center">
          <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
            <span>Merchant X Guide</span>
            {isSpeaking && <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">AI Voice Narrator</span>
        </div>
      </div>
    </div>
  );
};
