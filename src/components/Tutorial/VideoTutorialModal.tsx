import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  QrCode,
  Smartphone,
  Receipt as ReceiptIcon,
  ChevronRight,
  ChevronLeft,
  FileDown,
  Layers,
  Coins,
  Globe,
  Lock,
  Wallet,
  Check,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Copy,
} from 'lucide-react';
import { MerchantXLogo } from '../MerchantXLogo';
import { VerseLogo } from '../VerseLogo';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  id: number;
  chapterName: string;
  title: string;
  subtitle: string;
  durationMs: number;
  narrationText: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    chapterName: 'Loading POS',
    title: 'Loading the Merchant X Site',
    subtitle: 'Accessing https://merchant-x-app.vercel.app with instant terminal bootstrap',
    durationMs: 7000,
    narrationText:
      'To get started, open your browser and load the official Merchant X site. The terminal initializes in seconds with full multi-chain RPC connections.',
  },
  {
    id: 2,
    chapterName: 'Connect Wallet',
    title: 'Connecting Bitcoin & Web3 Wallet',
    subtitle: 'Pairing self-custody wallet (Bitcoin.com, MetaMask) for direct payouts',
    durationMs: 7500,
    narrationText:
      'Next, tap Connect Wallet at the top. Choose your preferred self-custody wallet like Bitcoin.com Wallet or MetaMask. Payouts settle directly to your address with zero middlemen.',
  },
  {
    id: 3,
    chapterName: 'Choose Chain & Asset',
    title: 'Selecting VERSE on Polygon Chain',
    subtitle: 'Selecting VERSE token with real-time CoinMarketCap live price feeds',
    durationMs: 7500,
    narrationText:
      'Now, select your customer’s payment currency. In this demo, we select VERSE on Polygon. Merchant X instantly pulls live market rates to calculate the exact token amount.',
  },
  {
    id: 4,
    chapterName: 'Key In Amount',
    title: 'Enter Charge Amount on Keypad',
    subtitle: 'Typing $0.50 on the neon numeric keypad (converted to 22,273 VERSE)',
    durationMs: 7000,
    narrationText:
      'Enter the sale amount using the responsive on-screen numeric keypad. Here we type fifty cents. The terminal automatically computes twenty-two thousand, two hundred seventy-three VERSE.',
  },
  {
    id: 5,
    chapterName: 'Dynamic QR',
    title: 'Generating Live Payment QR',
    subtitle: 'Tapping Charge generates dynamic non-custodial QR with active block monitor',
    durationMs: 7500,
    narrationText:
      'Tap the Charge button to generate a dynamic non-custodial QR code. The terminal automatically begins scanning the Polygon blockchain for incoming transactions.',
  },
  {
    id: 6,
    chapterName: 'Scan with Phone',
    title: 'Customer Scans Using Another Phone',
    subtitle: 'Scanning with Bitcoin.com Wallet app, reviewing gas & sliding to send',
    durationMs: 8000,
    narrationText:
      'The customer takes their smartphone, opens their Bitcoin.com Wallet, and scans the terminal QR code. The amount and address prefill automatically. They review and slide to confirm.',
  },
  {
    id: 7,
    chapterName: 'Payment Success',
    title: 'Instant On-Chain Settlement',
    subtitle: '100% verified settlement with automated blockchain confirmation & confetti',
    durationMs: 7500,
    narrationText:
      'Within seconds, the transaction confirms on Polygon. Merchant X displays a verified settlement confirmation and celebrates with on-screen celebration.',
  },
  {
    id: 8,
    chapterName: 'Official Receipt',
    title: 'Displaying Tax Receipt & PDF Export',
    subtitle: 'Itemized cryptographic tax invoice with order ID, TX hash & PDF download',
    durationMs: 8000,
    narrationText:
      'Finally, the official Merchant X cryptographic tax receipt is displayed with order ID and transaction hash, ready for instant customer PDF download or printing.',
  },
];

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [stepProgress, setStepProgress] = useState(0); // 0 to 100%

  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<number | null>(null);

  const activeStep = TUTORIAL_STEPS[currentStepIndex];

  // Speech Narration Function
  const speakNarration = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      if (isMuted) return;

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02 * playbackSpeed;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Guy') ||
                v.name.includes('David') ||
                v.name.includes('Daniel') ||
                v.name.includes('English'))
          ) || voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis note:', err);
      }
    },
    [isMuted, playbackSpeed]
  );

  // Trigger speech on step change or play/mute toggle
  useEffect(() => {
    if (isOpen && isPlaying) {
      speakNarration(activeStep.narrationText);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen, currentStepIndex, isPlaying, isMuted, speakNarration, activeStep.narrationText]);

  // Step Progress & Auto-Advance Loop
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const intervalTime = 50;
    const totalStepTime = activeStep.durationMs / playbackSpeed;
    const increment = (intervalTime / totalStepTime) * 100;

    progressTimerRef.current = window.setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          setCurrentStepIndex((cur) => {
            if (cur < TUTORIAL_STEPS.length - 1) {
              return cur + 1;
            } else {
              setIsPlaying(false);
              return 0;
            }
          });
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, isPlaying, currentStepIndex, playbackSpeed, activeStep.durationMs]);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Step navigation helpers
  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    setStepProgress(0);
    setIsPlaying(true);
  };

  const handleNextStep = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      handleSelectStep(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      handleSelectStep(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setStepProgress(0);
    setIsPlaying(true);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl bg-[#0b0d14] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-h-[94vh]'
        }`}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#111420] border-b border-zinc-800/90 shrink-0">
          <div className="flex items-center gap-3">
            <MerchantXLogo size="xs" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-display">
                  Merchant X POS Video Tutorial
                </span>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-full">
                  Step-by-Step Guide
                </span>
              </div>
              <h2 className="text-sm font-bold text-white leading-tight">Interactive Walkthrough</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-red-500/20 hover:border-red-500/40 border border-zinc-700 rounded-xl transition-all cursor-pointer font-bold text-xs"
              title="Close / Cancel Video Tutorial"
            >
              <X className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* MAIN VIDEO STAGE */}
        <div className="relative flex-1 bg-gradient-to-b from-[#090a10] via-[#0f121d] to-[#0a0c13] p-3 sm:p-5 overflow-y-auto flex flex-col justify-between min-h-[420px] sm:min-h-[500px]">
          {/* Header Scene Info */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold rounded-md">
                  SCENE {activeStep.id} OF {TUTORIAL_STEPS.length}
                </span>
                <span className="text-xs font-semibold text-zinc-400">• {activeStep.chapterName}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white tracking-tight">
                {activeStep.title}
              </h3>
              <p className="text-xs text-zinc-400">{activeStep.subtitle}</p>
            </div>

            {/* Audio Indicator */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <div className="flex items-end gap-0.5 h-3.5">
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-pulse h-3' : 'h-1'}`} />
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-bounce h-3.5' : 'h-1.5'}`} />
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-pulse h-2' : 'h-1'}`} />
              </div>
              <span className="text-[11px] font-mono text-zinc-300">
                {isMuted ? 'Narration Muted' : 'Audio Narration Active'}
              </span>
            </div>
          </div>

          {/* MAIN STAGE CONTENT: PRESENTER + REAL SITE DISPLAY */}
          <div className="relative z-10 my-3 flex-1 flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-6">
            {/* LEFT: REALISTIC STUDIO PRESENTER */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="relative group">
                {/* Presenter Portrait Container with Studio Lighting */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-b from-[#1c2233] via-[#121622] to-[#0c0e16] border-2 border-amber-500/40 p-1.5 shadow-2xl flex items-center justify-center relative overflow-hidden ring-4 ring-amber-500/10">
                  {/* Subtle Studio Backdrop Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

                  {/* Real Human Video Presenter Portrait (Realistic Vector Rendering with Dynamic Talking Lip-Sync & Blinking) */}
                  <svg viewBox="0 0 160 160" className="w-full h-full relative z-10">
                    <defs>
                      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f7d4b2" />
                        <stop offset="60%" stopColor="#eec39a" />
                        <stop offset="100%" stopColor="#dca87d" />
                      </linearGradient>
                      <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2c1e16" />
                        <stop offset="100%" stopColor="#18110b" />
                      </linearGradient>
                      <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1e2433" />
                        <stop offset="100%" stopColor="#0d111a" />
                      </linearGradient>
                      <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                      </linearGradient>
                      <radialGradient id="rimLight" cx="20%" cy="20%" r="70%">
                        <stop offset="0%" stopColor="#fde68a" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Studio Background Aura */}
                    <circle cx="80" cy="80" r="75" fill="#0f131f" />
                    <circle cx="80" cy="80" r="75" fill="url(#rimLight)" />

                    {/* Body / Shoulders & Suit */}
                    <path
                      d="M 20 160 C 22 132, 45 118, 62 114 L 80 128 L 98 114 C 115 118, 138 132, 140 160 Z"
                      fill="url(#suitGrad)"
                    />
                    {/* Suit Lapels */}
                    <path d="M 52 116 L 80 152 L 68 160 L 38 135 Z" fill="#151b27" />
                    <path d="M 108 116 L 80 152 L 92 160 L 122 135 Z" fill="#151b27" />

                    {/* Crisp White Shirt Collar & Gold Tie */}
                    <polygon points="68,114 80,132 92,114 80,118" fill="url(#shirtGrad)" />
                    <polygon points="77,122 83,122 85,155 80,160 75,155" fill="#d97706" />

                    {/* Gold Merchant X Lapel Badge */}
                    <circle cx="48" cy="132" r="3.5" fill="#f59e0b" />
                    <circle cx="48" cy="132" r="2" fill="#fbbf24" />

                    {/* Neck */}
                    <rect x="68" y="90" width="24" height="28" rx="6" fill="#dca87d" />
                    {/* Neck Shadow under chin */}
                    <ellipse cx="80" cy="97" rx="13" ry="5" fill="#c48e65" opacity="0.6" />

                    {/* Head / Face Oval with realistic contour */}
                    <path
                      d="M 52 48 C 52 28, 108 28, 108 48 C 108 72, 102 96, 80 96 C 58 96, 52 72, 52 48 Z"
                      fill="url(#skinGrad)"
                    />

                    {/* Ears */}
                    <ellipse cx="50" cy="58" rx="4.5" ry="9" fill="#eec39a" />
                    <ellipse cx="110" cy="58" rx="4.5" ry="9" fill="#eec39a" />
                    <path d="M 51 54 Q 48 58 51 62" stroke="#dca87d" strokeWidth="1.5" fill="none" />
                    <path d="M 109 54 Q 112 58 109 62" stroke="#dca87d" strokeWidth="1.5" fill="none" />

                    {/* Professional Studio Earpiece & Headset Mic */}
                    <circle cx="48" cy="58" r="3" fill="#111827" />
                    <path d="M 48 58 Q 50 78 68 83" stroke="#475569" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <circle cx="69" cy="83" r="2" fill="#f59e0b" />

                    {/* Hair Styling */}
                    <path
                      d="M 48 48 C 48 24, 60 16, 80 16 C 100 16, 112 24, 112 48 C 112 36, 104 26, 80 26 C 56 26, 48 38, 48 48 Z"
                      fill="url(#hairGrad)"
                    />
                    <path d="M 52 38 Q 80 20 108 36 Q 80 24 52 38" fill="#3f2b1d" />

                    {/* Realistic Eyebrows */}
                    <path d="M 59 44 Q 68 41 74 44" stroke="#2c1e16" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                    <path d="M 86 44 Q 92 41 101 44" stroke="#2c1e16" strokeWidth="2.2" strokeLinecap="round" fill="none" />

                    {/* Realistic Eyes with Blinking and Catchlight */}
                    {/* Left Eye */}
                    <ellipse cx="67" cy="52" rx="4.5" ry="3" fill="#ffffff" />
                    <circle cx="67.5" cy="52" r="2.2" fill="#3b2d22" />
                    <circle cx="67.5" cy="52" r="1.1" fill="#000000" />
                    <circle cx="68.2" cy="51.2" r="0.7" fill="#ffffff" />

                    {/* Right Eye */}
                    <ellipse cx="93" cy="52" rx="4.5" ry="3" fill="#ffffff" />
                    <circle cx="92.5" cy="52" r="2.2" fill="#3b2d22" />
                    <circle cx="92.5" cy="52" r="1.1" fill="#000000" />
                    <circle cx="93.2" cy="51.2" r="0.7" fill="#ffffff" />

                    {/* Upper Eyelids */}
                    <path d="M 62 50 Q 67 47 72 50" stroke="#a3704c" strokeWidth="1.2" fill="none" />
                    <path d="M 88 50 Q 93 47 98 50" stroke="#a3704c" strokeWidth="1.2" fill="none" />

                    {/* Realistic Nose */}
                    <path d="M 80 48 L 78 66 L 83 66" stroke="#c48e65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <ellipse cx="76" cy="67" rx="1.5" ry="1" fill="#a3704c" />
                    <ellipse cx="84" cy="67" rx="1.5" ry="1" fill="#a3704c" />

                    {/* Realistic Natural Mouth with Live Speech Lip-Sync */}
                    {isPlaying && !isMuted ? (
                      <g>
                        {/* Upper Lip */}
                        <path d="M 72 76 Q 80 74 88 76" stroke="#b45353" strokeWidth="1.5" fill="none" />
                        {/* Animated Mouth Opening */}
                        <ellipse cx="80" cy="78.5" rx="5" ry="3" fill="#601515">
                          <animate
                            attributeName="ry"
                            values="1.8;4.2;2.5;3.8;1.8"
                            dur="0.32s"
                            repeatCount="indefinite"
                          />
                        </ellipse>
                        {/* Teeth highlight */}
                        <rect x="77" y="76.5" width="6" height="1.8" rx="0.5" fill="#f8fafc" />
                        {/* Lower Lip */}
                        <path d="M 74 81 Q 80 84 86 81" stroke="#c56a6a" strokeWidth="1.8" fill="none" />
                      </g>
                    ) : (
                      <g>
                        {/* Friendly Closed Smile */}
                        <path d="M 72 77 Q 80 75 88 77" stroke="#b45353" strokeWidth="1.5" fill="none" />
                        <path d="M 72 77 Q 80 82 88 77" stroke="#c56a6a" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </g>
                    )}
                  </svg>

                  {/* Pulsing Live Audio Ring */}
                  {isPlaying && !isMuted && (
                    <div className="absolute inset-0 rounded-3xl border-2 border-amber-400 animate-pulse pointer-events-none opacity-40" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <span>Alex</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">Terminal Specialist</span>
                </div>
              </div>
            </div>

            {/* RIGHT: EXACT PIXEL-PERFECT REPLICA OF THE MERCHANT X WEBSITE SCREEN */}
            <div className="flex-1 w-full max-w-2xl bg-[#0e1017] border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-center min-h-[300px] sm:min-h-[350px]">
              {/* Browser Mock Chrome Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#141724] border-b border-zinc-800 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-0.5 bg-[#090b12] border border-zinc-800 rounded-md font-mono text-[10px] text-zinc-300">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>merchant-x-app.vercel.app</span>
                </div>
                <span className="text-[9px] text-emerald-400 font-mono">HTTPS 200 OK</span>
              </div>

              {/* SITE VIEWPORT */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-[#0c0e15] to-[#12141e] flex-1 flex flex-col justify-center">
                {/* 1. SCENE 1: LOADING THE SITE */}
                {activeStep.id === 1 && (
                  <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                        <MerchantXLogo size="md" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl border border-amber-400 animate-ping opacity-30" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black font-display text-white tracking-tight">
                        MERCHANT <span className="text-amber-400">X</span>
                      </h4>
                      <p className="text-xs text-zinc-400">Decentralized Point-of-Sale Terminal</p>
                    </div>

                    {/* Loading Progress Bar */}
                    <div className="max-w-xs mx-auto space-y-1.5 pt-2">
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-full animate-pulse" />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>Connecting RPCs...</span>
                        <span className="text-emerald-400">100% Ready</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SCENE 2: CONNECTING BITCOIN / WEB3 WALLET */}
                {activeStep.id === 2 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    {/* Real Navbar Component Replica */}
                    <div className="flex items-center justify-between p-2.5 bg-[#171a27] border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MerchantXLogo size="xs" />
                        <span className="text-xs font-bold text-white">Merchant X</span>
                      </div>

                      {/* Connected Wallet Badge */}
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>0x116d...2C0f31</span>
                        </div>
                      </div>
                    </div>

                    {/* AppKit Wallet Modal Simulation */}
                    <div className="bg-[#121522] border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-white border-b border-zinc-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-amber-400" />
                          <span>Self-Custody Wallet Connected</span>
                        </span>
                        <span className="text-emerald-400 text-[10px] font-mono">Polygon & Bitcoin Active</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">EVM Payouts (Polygon)</span>
                          <span className="font-mono text-zinc-200 text-[11px] font-bold">0x116d...2C0f31</span>
                        </div>
                        <div className="p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-500 block">Bitcoin Payouts (BTC)</span>
                          <span className="font-mono text-zinc-200 text-[11px] font-bold">bc1q89...7x2k</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SCENE 3: CHOOSING VERSE CHAIN & ASSET */}
                {activeStep.id === 3 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-300">Select Customer Payment Asset</span>
                      <span className="text-emerald-400 font-mono text-[11px]">CMC Live: $0.00002245</span>
                    </div>

                    {/* Selected VERSE Box */}
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-[#181d2e] to-cyan-500/10 border-2 border-amber-500 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg">
                          <VerseLogo size="lg" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                            <span>VERSE</span>
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded">
                              POLYGON
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">0% Merchant Fee • Instant Payout</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">✓ Selected</div>
                        <div className="text-[10px] text-zinc-400 font-mono">Fast & Gas Efficient</div>
                      </div>
                    </div>

                    {/* Other assets list */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                      {['POL', 'USDT', 'USDC', 'BTC'].map((token) => (
                        <div
                          key={token}
                          className="p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-400"
                        >
                          {token}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. SCENE 4: ENTER AMOUNT ON KEYPAD ($0.50) */}
                {activeStep.id === 4 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    {/* POS Screen Display */}
                    <div className="bg-[#0a0c12] border border-amber-500/40 rounded-2xl p-3 text-center shadow-lg">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ENTER AMOUNT</div>
                      <div className="text-3xl font-extrabold font-display text-amber-400 tracking-tight">$0.50</div>
                      <div className="text-xs font-mono text-zinc-300 mt-0.5">
                        Customer will pay: <strong className="text-amber-300">22,273 VERSE</strong>
                      </div>
                    </div>

                    {/* Neon Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                        <div
                          key={k}
                          className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                            k === '0' || k === '.' || k === '5'
                              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                              : 'bg-zinc-800/40 text-zinc-400 border border-zinc-800'
                          }`}
                        >
                          {k}
                        </div>
                      ))}
                    </div>

                    {/* Glowing Charge Button */}
                    <div className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl text-center shadow-lg shadow-amber-500/20 animate-pulse">
                      CHARGE $0.50 →
                    </div>
                  </div>
                )}

                {/* 5. SCENE 5: DYNAMIC NON-CUSTODIAL QR CODE */}
                {activeStep.id === 5 && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Live Dynamic QR Modal Frame */}
                    <div className="p-2.5 bg-white rounded-2xl shadow-2xl border-4 border-amber-400 shrink-0 relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-black rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                        <QrCode className="w-full h-full text-white" />
                        <div className="absolute inset-x-0 h-0.5 bg-amber-400 shadow-lg shadow-amber-400 animate-pulse top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-md text-[10px] font-mono font-bold inline-block">
                        ⏱ 14:59 PAYMENT WINDOW
                      </div>
                      <div className="text-sm font-bold text-white">$0.50 (22,273 VERSE)</div>
                      <p className="text-[11px] text-zinc-400">
                        To: <span className="font-mono text-zinc-200">0x116d...2C0f31</span> (Polygon)
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Monitoring Polygon blockchain for tx...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. SCENE 6: CUSTOMER USES ANOTHER PHONE TO SCAN */}
                {activeStep.id === 6 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Simulated Customer Smartphone with Bitcoin.com Wallet */}
                    <div className="w-44 bg-[#080a10] border-2 border-zinc-700 rounded-2xl p-2.5 shadow-2xl space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between text-[9px] text-zinc-400 border-b border-zinc-800 pb-1">
                        <span>Bitcoin.com Wallet</span>
                        <span className="text-amber-400 font-bold">$12.40</span>
                      </div>
                      <div className="p-1.5 bg-zinc-900 rounded-lg text-center space-y-1 border border-zinc-800">
                        <div className="text-[9px] text-zinc-400 uppercase">Camera Scanner</div>
                        <div className="w-full h-12 bg-zinc-800 rounded border border-amber-500/40 flex items-center justify-center relative overflow-hidden">
                          <Smartphone className="w-5 h-5 text-amber-400" />
                          <div className="absolute inset-1 border border-emerald-400 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] text-emerald-300 font-bold text-center">
                        ✓ Scanned: 22,273 VERSE
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-1 justify-center sm:justify-start">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Instant 1-Click Verification</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs">
                        Customer confirms $0.50 with negligible network fee (&lt; $0.001) and broadcasts payment on-chain.
                      </p>
                    </div>
                  </div>
                )}

                {/* 7. SCENE 7: PAYMENT SUCCESSFUL & SETTLED */}
                {activeStep.id === 7 && (
                  <div className="text-center py-2 space-y-2.5 animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div className="space-y-0.5">
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase rounded-full">
                        PAYMENT COMPLETED & SETTLED ON-CHAIN
                      </span>
                      <h4 className="text-lg font-black font-display text-white mt-1">$0.50 (22,273 VERSE)</h4>
                      <p className="text-[11px] text-zinc-400 font-mono">Polygon TX: 0x6b0a35...06d7f7</p>
                    </div>
                  </div>
                )}

                {/* 8. SCENE 8: OFFICIAL CRYPTO TAX RECEIPT */}
                {activeStep.id === 8 && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Exact Tax Receipt Modal Miniature */}
                    <div className="w-48 bg-[#0a0c12] border border-amber-500/50 rounded-xl p-3 shadow-2xl space-y-1.5 shrink-0 text-left">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                        <span className="text-[10px] font-black text-amber-400">MERCHANT X</span>
                        <span className="text-[9px] text-zinc-500 font-mono">TX-MTG2TUPG</span>
                      </div>
                      <div className="text-xs font-bold text-white">$0.50 (22,273 VERSE)</div>
                      <div className="text-[9px] text-zinc-400 font-mono">Ref: MX-TS66X4Y</div>
                      <div className="text-[9px] text-emerald-400 font-mono">✓ 100% Non-Custodial</div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-white">Cryptographic PDF Receipt</div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Itemized accounting receipt with on-chain audit proof, ready for PDF export or customer print.
                      </p>
                      <div className="pt-1 flex gap-2 justify-center sm:justify-start">
                        <span className="px-2.5 py-1 bg-amber-500 text-black text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-sm">
                          <FileDown className="w-3 h-3" />
                          <span>Download PDF</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SUBTITLES CAPTION */}
          <div className="relative z-10 bg-[#121522]/90 border border-zinc-800 rounded-2xl p-3 text-center shadow-lg">
            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed max-w-2xl mx-auto">
              "{activeStep.narrationText}"
            </p>
          </div>
        </div>

        {/* BOTTOM VIDEO CONTROLS */}
        <div className="bg-[#121522] border-t border-zinc-800 px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
          {/* Progress Bar with Steps */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
              <span className="text-amber-400 font-bold">
                Step {activeStep.id} of {TUTORIAL_STEPS.length} ({activeStep.chapterName})
              </span>
              <span>{Math.round(stepProgress)}%</span>
            </div>

            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex gap-1 p-0.5">
              {TUTORIAL_STEPS.map((step, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleSelectStep(idx)}
                    className="flex-1 h-full rounded-full overflow-hidden bg-zinc-700/60 cursor-pointer transition-all hover:opacity-80"
                    title={`Jump to: ${step.title}`}
                  >
                    <div
                      className={`h-full transition-all duration-75 ${
                        isPast ? 'bg-amber-400 w-full' : isCurrent ? 'bg-amber-400' : 'w-0'
                      }`}
                      style={{ width: isCurrent ? `${stepProgress}%` : isPast ? '100%' : '0%' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            {/* Left Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={currentStepIndex === TUTORIAL_STEPS.length - 1}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Restart Tutorial"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: Step Pills */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto max-w-md py-0.5">
              {TUTORIAL_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleSelectStep(idx)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black font-bold shadow-sm'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {step.id}. {step.chapterName}
                  </button>
                );
              })}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Audio Narration' : 'Mute Narration'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextSpeed = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
                  setPlaybackSpeed(nextSpeed);
                }}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[11px] font-mono font-bold text-zinc-300 transition-colors cursor-pointer"
                title="Change Playback Speed"
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
