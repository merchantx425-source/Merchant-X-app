import React from 'react';

interface ChelseaPresenterProps {
  isPlaying: boolean;
  isMuted: boolean;
}

export const ChelseaPresenter: React.FC<ChelseaPresenterProps> = ({ isPlaying, isMuted }) => {
  const isSpeaking = isPlaying && !isMuted;

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div className="relative group">
        {/* Presenter Portrait Video Container with Studio Lighting */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-b from-[#1c2233] via-[#121622] to-[#0c0e16] border-2 border-amber-500/40 p-1.5 shadow-2xl flex items-center justify-center relative overflow-hidden ring-4 ring-amber-500/10">
          {/* Subtle Studio Backdrop Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 pointer-events-none" />

          {/* High-Fidelity Presenter: Young woman in royal blue Chelsea jersey */}
          <div className={`relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center ${isSpeaking ? 'animate-[subtle-sway_4s_ease-in-out_infinite]' : ''}`}>
            {/* Base Presenter Image */}
            <img
              src="/presenter_chelsea.jpg"
              alt="Video Presenter"
              className="w-full h-full object-cover object-top"
              referrerPolicy="no-referrer"
            />

            {/* Talking Mouth Lip-Sync Overlay positioned naturally over mouth area */}
            {isSpeaking && (
              <div className="absolute top-[58%] left-[46%] -translate-x-1/2 -translate-y-1/2 w-8 h-5 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 40 25" className="w-full h-full">
                  <defs>
                    <linearGradient id="chelseaLipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#4a2618" />
                      <stop offset="50%" stopColor="#2c140c" />
                      <stop offset="100%" stopColor="#5c2e1f" />
                    </linearGradient>
                  </defs>
                  {/* Subtle blur for natural blending */}
                  <ellipse cx="20" cy="12" rx="11" ry="6" fill="#381b10" opacity="0.85" filter="blur(0.5px)" />
                  <ellipse cx="20" cy="12" rx="8" ry="4" fill="#150804">
                    <animate
                      attributeName="ry"
                      values="2;5.5;3;6;2.5;5;2"
                      dur="0.32s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="rx"
                      values="7;9;7.5;9.5;7"
                      dur="0.45s"
                      repeatCount="indefinite"
                    />
                  </ellipse>
                  {/* Natural teeth hint */}
                  <rect x="16" y="9.5" width="8" height="2" rx="1" fill="#f8fafc" opacity="0.9" />
                  {/* Natural lower lip line */}
                  <path d="M 10 14 Q 20 18 30 14" stroke="#683524" strokeWidth="1.8" fill="none" opacity="0.9" />
                </svg>
              </div>
            )}

            {/* Subtle natural eye blink simulation during speaking */}
            {isSpeaking && (
              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-16 h-3 pointer-events-none opacity-0 animate-[blink_5s_infinite]">
                <div className="w-full h-full bg-[#3d2015] rounded-full filter blur-[1px]" />
              </div>
            )}
          </div>

          {/* Pulsing Live Audio Ring */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-400 animate-pulse pointer-events-none opacity-40" />
          )}

          {/* Live indicator dot in corner */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10">
            <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
