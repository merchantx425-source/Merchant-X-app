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
  Scan,
  ShieldAlert,
  Radio,
  FileCheck,
  CheckCheck,
} from 'lucide-react';
import { MerchantXLogo } from '../MerchantXLogo';
import { VerseLogo } from '../VerseLogo';
import { ALL_CHAINS, ChainLogo } from './ChainLogos';
import { PdfReceiptViewer } from './PdfReceiptViewer';
import { MerchantXPresenter } from './MerchantXPresenter';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TutorialStep {
  id: number;
  chapterName: string;
  title: string;
  subtitle: string;
  durationMs: number;
  narrationText: string;
  roleBadge: 'MERCHANT DEVICE' | 'CUSTOMER DEVICE';
}

export const TUTORIAL_13_STEPS: TutorialStep[] = [
  {
    id: 1,
    chapterName: 'Open Merchant X',
    title: 'SCENE 1 — MERCHANT OPENS MERCHANT X',
    subtitle: 'Loading official Merchant X POS with multi-asset crypto support & live rates',
    durationMs: 8000,
    narrationText:
      'Welcome to Merchant X, the non-custodial Web3 point-of-sale terminal. The merchant opens the official Merchant X application. Notice the clean branding, multi-chain architecture, and intuitive numeric terminal interface ready to accept instant crypto payments across VERSE, POL, USDT, USDC, ETH, and BTC.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 2,
    chapterName: 'Connect Wallet',
    title: 'SCENE 2 — MERCHANT CONNECTS WALLET',
    subtitle: 'Pairing merchant settlement address for direct non-custodial payouts',
    durationMs: 8000,
    narrationText:
      'The merchant clicks Connect Wallet at the top of the terminal to link their merchant settlement address. Self-custody funds route directly into the merchant’s private address. Crucially, Merchant X is merchant-side only—customers never connect their wallets to the POS.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 3,
    chapterName: 'Select VERSE',
    title: 'SCENE 3 — SELECT VERSE',
    subtitle: 'Selecting VERSE token on Polygon with real-time CoinMarketCap price calculation',
    durationMs: 8000,
    narrationText:
      'On the terminal asset selector, the merchant selects VERSE on Polygon. Merchant X instantly pulls live market rates to calculate dynamic conversion with zero processor cuts and zero intermediary custody.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 4,
    chapterName: 'Enter Amount',
    title: 'SCENE 4 — ENTER PAYMENT AMOUNT',
    subtitle: 'Keying in sale total ($0.50) converted to 22,273 VERSE in real time',
    durationMs: 7500,
    narrationText:
      'The merchant keys in the sale total on the responsive numeric keypad—here entering fifty cents. Merchant X automatically computes the exact payment total of twenty-two thousand, two hundred seventy-three VERSE in real-time.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 5,
    chapterName: 'Press Charge',
    title: 'SCENE 5 — PRESS CHARGE',
    subtitle: 'Tapping Charge initiates non-custodial session & locks exchange rate',
    durationMs: 7500,
    narrationText:
      'The merchant presses the glowing CHARGE button. Merchant X locks the price feed, initiates an active blockchain session, and generates an on-chain non-custodial payment request.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 6,
    chapterName: 'Display QR',
    title: 'SCENE 6 — DISPLAY PAYMENT QR CODE',
    subtitle: 'Dynamic on-chain QR with countdown timer & active Polygon mempool listener',
    durationMs: 8000,
    narrationText:
      'Merchant X displays the dynamic payment QR code with the merchant’s receiving address, exact VERSE amount, and a live countdown window. The terminal continuously monitors Polygon RPCs for incoming block transactions.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 7,
    chapterName: 'Bitcoin.com Wallet',
    title: 'SCENE 7 — CUSTOMER OPENS BITCOIN.COM WALLET',
    subtitle: 'Customer launches Bitcoin.com Wallet on personal phone (No Merchant X portal)',
    durationMs: 8000,
    narrationText:
      'Now switching to the customer’s perspective on their own mobile device. The customer does not open Merchant X. The customer opens their personal Bitcoin.com Wallet app and taps the QR camera scanner.',
    roleBadge: 'CUSTOMER DEVICE',
  },
  {
    id: 8,
    chapterName: 'Scan POS QR',
    title: 'SCENE 8 — CUSTOMER SCANS MERCHANT X QR CODE',
    subtitle: 'Camera viewfinder aligns with Merchant X POS screen & reads payment parameters',
    durationMs: 8000,
    narrationText:
      'The customer points their camera at the Merchant X POS screen. The Bitcoin.com Wallet scanner instantly detects the payment request, auto-filling the merchant address and exact VERSE token amount.',
    roleBadge: 'CUSTOMER DEVICE',
  },
  {
    id: 9,
    chapterName: 'Confirm Payment',
    title: 'SCENE 9 — CUSTOMER CONFIRMS PAYMENT',
    subtitle: 'Reviewing 22,273 VERSE ($0.50) + sub-cent Polygon gas fee & sliding to confirm',
    durationMs: 8000,
    narrationText:
      'Inside Bitcoin.com Wallet, the customer reviews the payment summary—twenty-two thousand, two hundred seventy-three VERSE with sub-cent Polygon gas fee—and slides to confirm. The transaction is instantly broadcast to the blockchain.',
    roleBadge: 'CUSTOMER DEVICE',
  },
  {
    id: 10,
    chapterName: 'Detecting TX',
    title: 'SCENE 10 — MERCHANT X DETECTS PAYMENT',
    subtitle: 'Terminal detects incoming block transaction & verifies on-chain parameters',
    durationMs: 8500,
    narrationText:
      'Back on the merchant’s Merchant X terminal, the system detects the incoming mempool transaction. Merchant X verifies the blockchain network, merchant recipient address, token contract, and exact payment amount in real-time.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 11,
    chapterName: 'Approved',
    title: 'SCENE 11 — PAYMENT APPROVED',
    subtitle: '100% verified settlement with cryptographic approval & balance update',
    durationMs: 8000,
    narrationText:
      'Verification complete! Merchant X displays the official APPROVED and SUCCESSFUL confirmation. Funds have settled directly into the merchant’s self-custody wallet.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 12,
    chapterName: 'Receipt Generated',
    title: 'SCENE 12 — RECEIPT GENERATED',
    subtitle: 'Itemized cryptographic tax receipt with order ID, TX hash & audit trail',
    durationMs: 8000,
    narrationText:
      'Merchant X automatically compiles the cryptographic tax receipt, featuring itemized order totals, timestamp, reference ID, and verifiable on-chain audit links.',
    roleBadge: 'MERCHANT DEVICE',
  },
  {
    id: 13,
    chapterName: 'Download PDF',
    title: 'SCENE 13 — DOWNLOAD PDF & VIEW RECEIPT',
    subtitle: 'Merchant clicks Download PDF to export & view high-resolution tax invoice',
    durationMs: 8500,
    narrationText:
      'The merchant clicks Download PDF. The official invoice downloads immediately, opens up, and displays the complete high-resolution cryptographic PDF receipt ready for accounting and customer records.',
    roleBadge: 'MERCHANT DEVICE',
  },
];

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [stepProgress, setStepProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<number | null>(null);

  const activeStep = TUTORIAL_13_STEPS[currentStepIndex];

  // Speech Narration Function (AI Voice with Web Speech API)
  const speakNarration = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      if (isMuted) return;

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0 * playbackSpeed;
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
                v.name.includes('English') ||
                v.name.includes('Alex'))
          ) || voices.find((v) => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis notice:', err);
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
            if (cur < TUTORIAL_13_STEPS.length - 1) {
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
    if (currentStepIndex < TUTORIAL_13_STEPS.length - 1) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 overflow-hidden">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl bg-[#0b0d14] border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-h-[96dvh] h-full sm:h-auto'
        }`}
      >
        {/* TOP BAR - CLEAN & PROMINENT MERCHANT X */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#111420] border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <MerchantXLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 font-display">
                  Merchant X POS Video Demo
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white leading-tight truncate max-w-[200px] sm:max-w-none">
                VERSE Payment via Bitcoin.com Wallet
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 sm:p-2 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-red-500/20 hover:border-red-500/50 border border-zinc-700/80 rounded-xl transition-all cursor-pointer shadow-sm group"
              title="Close Video Demo"
            >
              <X className="w-4 h-4 text-zinc-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* MAIN VIDEO STAGE */}
        <div className="relative flex-1 bg-gradient-to-b from-[#090a10] via-[#0f121d] to-[#0a0c13] p-2.5 sm:p-5 overflow-y-auto flex flex-col justify-between min-h-0">
          {/* Header Scene Info */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold rounded-md">
                  SCENE {activeStep.id} OF {TUTORIAL_13_STEPS.length}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    activeStep.roleBadge === 'MERCHANT DEVICE'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {activeStep.roleBadge === 'MERCHANT DEVICE'
                    ? '💻 Merchant Device (Merchant X)'
                    : '📱 Customer Device (Bitcoin.com Wallet)'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white tracking-tight">
                {activeStep.title}
              </h3>
              <p className="text-xs text-zinc-400">{activeStep.subtitle}</p>
            </div>

            {/* Subtle Audio Status Indicator */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <div className="flex items-end gap-0.5 h-3.5">
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-pulse h-3' : 'h-1'}`} />
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-bounce h-3.5' : 'h-1.5'}`} />
                <span className={`w-1 bg-amber-400 rounded-full ${isPlaying && !isMuted ? 'animate-pulse h-2' : 'h-1'}`} />
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {isMuted ? 'Muted' : 'Audio On'}
              </span>
            </div>
          </div>

          {/* MAIN STAGE CONTENT: AI TALKING PRESENTER + SCREEN RECORDING VIEW */}
          <div className="relative z-10 my-3 flex-1 flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-6">
            {/* LEFT: AI PRESENTER (MERCHANT X LOGO) */}
            <MerchantXPresenter isPlaying={isPlaying} isMuted={isMuted} />

            {/* RIGHT: EXACT SCREEN RECORDING / INTERFACE DISPLAY */}
            <div className="flex-1 w-full max-w-2xl bg-[#0e1017] border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-center min-h-[320px] sm:min-h-[370px]">
              {/* Browser Chrome Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#141724] border-b border-zinc-800 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-0.5 bg-[#090b12] border border-zinc-800 rounded-md font-mono text-[10px] text-zinc-300">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>
                    {activeStep.roleBadge === 'MERCHANT DEVICE'
                      ? 'merchant-x-app.vercel.app'
                      : 'Bitcoin.com Wallet (iOS / Android)'}
                  </span>
                </div>
                <span className="text-[9px] text-emerald-400 font-mono">
                  {activeStep.roleBadge === 'MERCHANT DEVICE' ? 'POS TERMINAL' : 'CUSTOMER WALLET'}
                </span>
              </div>

              {/* SITE VIEWPORT CONTENT */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-[#0c0e15] to-[#12141e] flex-1 flex flex-col justify-center">
                {/* 1. SCENE 1: MERCHANT OPENS MERCHANT X */}
                {activeStep.id === 1 && (
                  <div className="text-center py-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                        <MerchantXLogo size="md" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl border border-amber-400 animate-ping opacity-30" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black font-display text-white tracking-tight">
                        MERCHANT <span className="text-amber-400">X</span>
                      </h4>
                      <p className="text-xs text-zinc-400">Decentralized Web3 Point-of-Sale Terminal</p>
                    </div>

                    {/* Supported Crypto Asset Badges in Scene 1: VERSE, POL, USDT, USDC, ETH, BTC */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto pt-1">
                      {ALL_CHAINS.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900/80 border border-zinc-800 rounded-md text-[10px] text-zinc-300"
                        >
                          <ChainLogo chainId={c.id} size="xs" />
                          <span className="font-semibold">{c.symbol}</span>
                        </div>
                      ))}
                    </div>

                    {/* Loading Progress */}
                    <div className="max-w-xs mx-auto space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-full animate-pulse" />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>Terminal Initialized</span>
                        <span className="text-emerald-400">Ready for Payment</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SCENE 2: MERCHANT CONNECTS WALLET */}
                {activeStep.id === 2 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-2.5 bg-[#171a27] border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MerchantXLogo size="xs" />
                        <span className="text-xs font-bold text-white">Merchant X Terminal</span>
                      </div>

                      <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>0x116d...2C0f31</span>
                      </div>
                    </div>

                    {/* Merchant Settlement Only Box */}
                    <div className="bg-[#121522] border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-white border-b border-zinc-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-amber-400" />
                          <span>Merchant POS Payout Wallet (Self-Custody)</span>
                        </span>
                        <span className="text-emerald-400 text-[10px] font-mono">100% Non-Custodial</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-400 block">Polygon / EVM Address</span>
                          <span className="font-mono text-zinc-200 text-[11px] font-bold">0x116d...2C0f31</span>
                        </div>
                        <div className="p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                          <span className="text-[10px] text-zinc-400 block">Bitcoin Address</span>
                          <span className="font-mono text-zinc-200 text-[11px] font-bold">bc1q89...7x2k</span>
                        </div>
                      </div>

                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 text-center font-semibold">
                        🔒 Customer Never Connects Wallet to Merchant X • Direct On-Chain Settlement
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SCENE 3: SELECT VERSE */}
                {activeStep.id === 3 && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-300">Select Customer Payment Asset</span>
                      <span className="text-emerald-400 font-mono text-[11px]">CMC Live: $0.00002245</span>
                    </div>

                    {/* Selected VERSE Highlight Box */}
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

                    {/* Other supported crypto assets */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                      {['pol', 'usdt', 'usdc', 'eth', 'btc'].map((token) => (
                        <div
                          key={token}
                          className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[10px] text-zinc-300 flex items-center justify-center gap-1 font-mono"
                        >
                          <ChainLogo chainId={token} size="xs" />
                          <span className="font-semibold uppercase">{token}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. SCENE 4: ENTER PAYMENT AMOUNT */}
                {activeStep.id === 4 && (
                  <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#0a0c12] border border-amber-500/40 rounded-2xl p-2.5 text-center shadow-lg">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ENTER AMOUNT</div>
                      <div className="text-3xl font-extrabold font-display text-amber-400 tracking-tight">$0.50</div>
                      <div className="text-xs font-mono text-zinc-300 mt-0.5">
                        Customer will pay: <strong className="text-amber-300">22,273 VERSE</strong>
                      </div>
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                        <div
                          key={k}
                          className={`h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                            k === '0' || k === '.' || k === '5'
                              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                              : 'bg-zinc-800/40 text-zinc-400 border border-zinc-800'
                          }`}
                        >
                          {k}
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-center text-zinc-400 font-mono">
                      Rate locked: 1 VERSE = $0.00002245 USD
                    </div>
                  </div>
                )}

                {/* 5. SCENE 5: PRESS CHARGE */}
                {activeStep.id === 5 && (
                  <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-w-xs mx-auto p-4 bg-[#121522] border border-amber-500/40 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Total Due:</span>
                        <span className="text-amber-300 font-bold">$0.50 (22,273 VERSE)</span>
                      </div>

                      {/* Glowing CHARGE Button */}
                      <div className="p-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm uppercase tracking-wider rounded-xl text-center shadow-lg shadow-amber-500/30 animate-pulse cursor-pointer flex items-center justify-center gap-2">
                        <span>CHARGE $0.50</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Generating Non-Custodial Blockchain Request</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. SCENE 6: DISPLAY PAYMENT QR CODE */}
                {activeStep.id === 6 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Real Dynamic QR Frame */}
                    <div className="p-2.5 bg-white rounded-2xl shadow-2xl border-4 border-amber-400 shrink-0 relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-black rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                        <QrCode className="w-full h-full text-white" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-black border border-cyan-400 flex items-center justify-center p-0.5">
                            <VerseLogo size="xs" />
                          </div>
                        </div>
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
                        <span>Monitoring Polygon RPCs for incoming block tx...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. SCENE 7: CUSTOMER OPENS BITCOIN.COM WALLET */}
                {activeStep.id === 7 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Simulated Customer Smartphone with Bitcoin.com Wallet */}
                    <div className="w-48 bg-[#090b12] border-2 border-zinc-700 rounded-3xl p-3 shadow-2xl space-y-2 shrink-0">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1.5">
                        <span className="font-bold text-white">Bitcoin.com Wallet</span>
                        <span className="text-emerald-400 font-mono font-bold">$24.80</span>
                      </div>

                      <div className="p-2 bg-zinc-900/90 rounded-xl space-y-1 border border-zinc-800 text-left">
                        <span className="text-[9px] text-zinc-400 block">Available Balance</span>
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>120,400 VERSE</span>
                          <span className="text-[9px] text-cyan-400">Polygon</span>
                        </div>
                      </div>

                      <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center flex items-center justify-center gap-1.5 text-amber-300 text-xs font-bold">
                        <Scan className="w-4 h-4 text-amber-400" />
                        <span>Tap Scan QR</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-cyan-300 flex items-center gap-1 justify-center sm:justify-start">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        <span>Customer's Personal Phone</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed max-w-xs">
                        The customer opens Bitcoin.com Wallet. Customer has zero Merchant X app and zero login.
                      </p>
                    </div>
                  </div>
                )}

                {/* 8. SCENE 8: CUSTOMER SCANS MERCHANT X QR CODE */}
                {activeStep.id === 8 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-48 bg-[#090b12] border-2 border-amber-400 rounded-3xl p-3 shadow-2xl space-y-2 shrink-0 relative overflow-hidden">
                      <div className="text-[9px] text-center text-zinc-400 uppercase font-mono">
                        Bitcoin.com Camera View
                      </div>
                      <div className="w-full h-24 bg-zinc-900 rounded-xl border border-amber-500/50 flex items-center justify-center relative overflow-hidden">
                        <QrCode className="w-12 h-12 text-zinc-400 opacity-60" />
                        <div className="absolute inset-2 border-2 border-emerald-400 rounded-lg animate-pulse" />
                        <div className="absolute inset-x-0 h-0.5 bg-emerald-400 top-1/2 -translate-y-1/2 shadow-lg shadow-emerald-400" />
                      </div>
                      <div className="p-1 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-bold text-center">
                        ✓ QR Code Detected!
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-white flex items-center gap-1 justify-center sm:justify-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Instant Parameter Auto-Fill</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs">
                        Scanned destination: <span className="font-mono text-zinc-200">0x116d...2C0f31</span>
                        <br />
                        Auto-filled amount: <span className="font-bold text-amber-300">22,273 VERSE ($0.50)</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* 9. SCENE 9: CUSTOMER CONFIRMS PAYMENT */}
                {activeStep.id === 9 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-52 bg-[#090b12] border-2 border-zinc-700 rounded-3xl p-3 shadow-2xl space-y-2 shrink-0 text-left">
                      <div className="text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1">
                        Confirm VERSE Payment
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Amount:</span>
                          <span className="font-bold text-white">22,273 VERSE ($0.50)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Network Fee:</span>
                          <span className="text-emerald-400">&lt; $0.001 (Polygon)</span>
                        </div>
                      </div>

                      {/* Slide to Pay Simulation */}
                      <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-[11px] rounded-xl text-center shadow-md flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Slide to Pay → Broadcast</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-emerald-400">Broadcasting On-Chain...</div>
                      <p className="text-[11px] text-zinc-400 max-w-xs">
                        The customer authorizes transaction with Bitcoin.com Wallet. Tx broadcasted immediately to Polygon network.
                      </p>
                    </div>
                  </div>
                )}

                {/* 10. SCENE 10: MERCHANT X DETECTS PAYMENT */}
                {activeStep.id === 10 && (
                  <div className="space-y-2.5 animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>Payment Detected! Verifying On-Chain Parameters...</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">Polygon PoS</span>
                    </div>

                    <div className="p-3 bg-[#111420] border border-zinc-800 rounded-2xl space-y-1.5 text-left text-xs font-mono">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>[✓] Network:</span>
                        <span className="text-emerald-400">Polygon Mainnet (137)</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>[✓] Merchant Recipient:</span>
                        <span className="text-zinc-200">0x116d...2C0f31</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>[✓] Token Contract:</span>
                        <span className="text-cyan-400">VERSE</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>[✓] Amount:</span>
                        <span className="text-amber-300 font-bold">22,273 VERSE ($0.50)</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-300">
                        <span>[✓] Blockchain Tx Hash:</span>
                        <span className="text-zinc-400 truncate max-w-[140px]">0x6b0a35...06d7f7</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 11. SCENE 11: PAYMENT APPROVED */}
                {activeStep.id === 11 && (
                  <div className="text-center py-2 space-y-2.5 animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <div className="space-y-0.5">
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase rounded-full">
                        PAYMENT APPROVED & SETTLED ON-CHAIN
                      </span>
                      <h4 className="text-lg font-black font-display text-white mt-1">$0.50 (22,273 VERSE)</h4>
                      <p className="text-[11px] text-zinc-400 font-mono">Polygon Block Confirmed • Zero Middlemen</p>
                    </div>
                  </div>
                )}

                {/* 12. SCENE 12: RECEIPT GENERATED */}
                {activeStep.id === 12 && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-52 bg-[#0a0c12] border border-amber-500/50 rounded-xl p-3 shadow-2xl space-y-1.5 shrink-0 text-left">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                        <span className="text-[10px] font-black text-amber-400">MERCHANT X</span>
                        <span className="text-[9px] text-zinc-500 font-mono">MX-882910</span>
                      </div>
                      <div className="text-xs font-bold text-white">$0.50 (22,273 VERSE)</div>
                      <div className="text-[9px] text-zinc-400 font-mono">Payer: Bitcoin.com Wallet</div>
                      <div className="text-[9px] text-emerald-400 font-mono">✓ 100% Cryptographic Proof</div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-bold text-white">Official Tax Invoice Generated</div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs">
                        Itemized accounting receipt with on-chain audit proof, order ID, and transaction link.
                      </p>
                    </div>
                  </div>
                )}

                {/* 13. SCENE 13: DOWNLOAD PDF & VIEW RECEIPT */}
                {activeStep.id === 13 && (
                  <PdfReceiptViewer
                    onDownloadRealPdf={() => {
                      // Trigger download simulation or notification
                      console.log('Real PDF Receipt Download Triggered');
                    }}
                  />
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
          {/* Progress Bar with 13 Steps */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
              <span className="text-amber-400 font-bold">
                Step {activeStep.id} of {TUTORIAL_13_STEPS.length} ({activeStep.chapterName})
              </span>
              <span>{Math.round(stepProgress)}%</span>
            </div>

            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {TUTORIAL_13_STEPS.map((step, idx) => {
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
                disabled={currentStepIndex === TUTORIAL_13_STEPS.length - 1}
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

            {/* Middle: Step Pills for quick jumping */}
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-md py-0.5">
              {TUTORIAL_13_STEPS.map((step, idx) => {
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
                title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
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
