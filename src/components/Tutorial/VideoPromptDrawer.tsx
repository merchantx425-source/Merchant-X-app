import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  Clapperboard,
  Film,
  X,
  Layers,
  Video,
  FileText,
  Camera,
  Mic,
  Monitor,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';

interface VideoPromptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FULL_AI_VIDEO_PROMPT_TEXT = `PROMPT FOR AI VIDEO GENERATION ENGINE (SORA / RUNWAY GEN-3 / KLING / PIKA / MIDJOURNEY):

================================================================================
MERCHANT X — 13-SCENE MASTER PRODUCT DEMO VIDEO PROMPT (VERSE PAYMENT WALKTHROUGH)
================================================================================

[CORE SYSTEM RULE & ARCHITECTURE]
- Role Separation: Merchant X is MERCHANT-SIDE ONLY. There is NO customer-side Merchant X website.
- Customer Environment: The customer never opens Merchant X, never logs into Merchant X, and never connects their wallet to Merchant X. The customer exclusively uses the official Bitcoin.com Wallet mobile app.
- UI Fidelity: The merchant-side scenes must display the authentic Merchant X POS web application (dark luxury interface, gold accents #F59E0B, multi-chain badges for Bitcoin, Polygon, Ethereum, BNB Chain, Solana, Avalanche, Arbitrum, Base, Optimism, and Verse DEX).
- Camera Style: Crisp 4K 60fps macro product cinematography, seamless natural screen recordings, macro closeups of glowing OLED screens, natural warm studio rim lighting, and crystal-clear high contrast typography.

--------------------------------------------------------------------------------
SCENE BREAKDOWN (13 SCENES)
--------------------------------------------------------------------------------

SCENE 1 — MERCHANT OPENS MERCHANT X
- Visual: Clean wide-angle transitioning to medium desktop screen recording of the official Merchant X POS terminal loading in a browser. Shows dark graphite canvas (#0A0B14), gold branding "MERCHANT X", multi-chain status bar featuring official chain logos (Bitcoin BTC, Polygon POL, Ethereum ETH, BNB Chain, Solana, Avalanche, Arbitrum, Base, Optimism, and VERSE DEX), live CoinMarketCap price feeds, and the neon numeric keypad ready for transactions.
- Audio Narration: "Welcome to Merchant X, the non-custodial Web3 point-of-sale terminal. The merchant opens the official Merchant X application. Notice the clean branding, multi-chain architecture, and intuitive numeric terminal interface ready to accept instant crypto payments across Bitcoin, Polygon, Ethereum, BNB Chain, Solana, Avalanche, and Verse."

SCENE 2 — MERCHANT CONNECTS WALLET
- Visual: Close-up on the Merchant X top navigation. The merchant's cursor clicks the glowing "Connect Wallet" button. The AppKit modal appears, connecting the merchant's settlement wallet. Upon authorization, the UI updates with the verified green badge: "0x116d...2C0f31 (Polygon & EVM)" and Bitcoin address "bc1q89...7x2k". A clear label emphasizes: "Merchant Receiving Wallet Only — Customer Never Connects to POS".
- Audio Narration: "The merchant clicks 'Connect Wallet' at the top of the terminal to link their merchant settlement address. Self-custody funds route directly into the merchant's private address. Crucially, Merchant X is merchant-side only—customers never connect their wallets to the POS."

SCENE 3 — SELECT VERSE
- Visual: The merchant moves to the asset selector row. They click the VERSE token badge on Polygon. The VERSE card illuminates with a gold neon border and vibrant cyan/purple Verse logo, displaying real-time CMC rates ($0.00002245) and a "0% Merchant Fee • Instant Payout" guarantee.
- Audio Narration: "On the terminal asset selector, the merchant selects VERSE on Polygon. Merchant X instantly pulls live market rates to calculate dynamic conversion with zero processor cuts and zero intermediary custody."

SCENE 4 — ENTER PAYMENT AMOUNT
- Visual: High-framerate shot of the merchant typing on the responsive neon keypad: "0", ".", "5", "0". The main display renders "$0.50 USD", dynamically computing the exact token total: "22,273 VERSE".
- Audio Narration: "The merchant keys in the sale total on the responsive numeric keypad—here entering fifty cents. Merchant X automatically computes the exact payment total of twenty-two thousand, two hundred seventy-three VERSE in real-time."

SCENE 5 — PRESS CHARGE
- Visual: The merchant clicks the glowing amber button "CHARGE $0.50 →". A subtle haptic ripple animation fires across the interface as the terminal initiates a non-custodial blockchain listener and locks the exchange rate.
- Audio Narration: "The merchant presses the glowing 'CHARGE' button. Merchant X locks the price feed, initiates an active blockchain session, and generates an on-chain non-custodial payment request."

SCENE 6 — DISPLAY PAYMENT QR CODE
- Visual: The screen transitions smoothly to the Merchant X Payment Modal. A crisp, high-contrast QR code is displayed with the VERSE icon centered. Below it, a countdown timer ("14:59"), merchant receiver address ("0x116d...2C0f31"), and a pulsing green radar icon indicate active Polygon block monitoring.
- Audio Narration: "Merchant X displays the dynamic payment QR code with the merchant's receiving address, exact VERSE amount, and a live countdown window. The terminal continuously monitors Polygon RPCs for incoming block transactions."

SCENE 7 — CUSTOMER OPENS BITCOIN.COM WALLET
- Visual: Camera cuts to a handheld customer smartphone (iPhone / Android). The customer is holding their phone in front of the terminal. The screen shows the genuine Bitcoin.com Wallet app with their VERSE balance and wallet layout. The customer taps the camera scan icon. No Merchant X UI is present on the customer's phone.
- Audio Narration: "Now switching to the customer's perspective on their own mobile device. The customer does not open Merchant X. The customer opens their personal Bitcoin.com Wallet app and taps the QR camera scanner."

SCENE 8 — CUSTOMER SCANS MERCHANT X QR CODE
- Visual: The customer aims the Bitcoin.com Wallet viewfinder at the Merchant X screen. The camera reticle locks onto the exact QR code displayed by the POS terminal. An instant haptic beep triggers, and the phone immediately reads the payment URI.
- Audio Narration: "The customer points their camera at the Merchant X POS screen. The Bitcoin.com Wallet scanner instantly detects the payment request, auto-filling the merchant address and exact VERSE token amount."

SCENE 9 — CUSTOMER CONFIRMS PAYMENT
- Visual: Inside the Bitcoin.com Wallet review screen, the transaction summary appears: "Send 22,273 VERSE ($0.50)", Recipient: "0x116d...2C0f31", Network Fee: "< $0.001 (Polygon)". The customer slides the "Slide to Pay" slider. The screen updates to "Transaction Broadcast to Polygon".
- Audio Narration: "Inside Bitcoin.com Wallet, the customer reviews the payment summary—twenty-two thousand, two hundred seventy-three VERSE with sub-cent Polygon gas fee—and slides to confirm. The transaction is instantly broadcast to the blockchain."

SCENE 10 — MERCHANT X DETECTS PAYMENT
- Visual: Camera cuts back to the Merchant X terminal screen. An animated verification HUD appears: "Payment Detected on Polygon! Verifying On-Chain Parameters...". An animated check sequence verifies:
  1. [✓] Network: Polygon PoS Mainnet
  2. [✓] Merchant Recipient: 0x116d...2C0f31
  3. [✓] Token Contract: VERSE
  4. [✓] Amount: 22,273 VERSE ($0.50)
  5. [✓] Blockchain Tx Hash: 0x6b0a...06d7f7
- Audio Narration: "Back on the merchant's Merchant X terminal, the system detects the incoming mempool transaction. Merchant X verifies the blockchain network, merchant recipient address, token contract, and exact payment amount in real-time."

SCENE 11 — PAYMENT APPROVED
- Visual: The verification completes with a satisfying acoustic chime. The screen transitions into the official Merchant X "PAYMENT APPROVED & SETTLED ON-CHAIN" success state, showing the green shield, confirmed block height, and merchant self-custody settlement status.
- Audio Narration: "Verification complete! Merchant X displays the official APPROVED and SUCCESSFUL confirmation. Funds have settled directly into the merchant's self-custody wallet."

SCENE 12 — RECEIPT GENERATED
- Visual: Merchant X automatically generates the cryptographic tax invoice. The luxury gold-bordered receipt modal displays itemized line items, order ID (MX-882910), timestamp, customer payment method (Bitcoin.com Wallet), and PolygonScan audit verification link.
- Audio Narration: "Merchant X automatically compiles the cryptographic tax receipt, featuring itemized order totals, timestamp, reference ID, and verifiable on-chain audit links."

SCENE 13 — DOWNLOAD PDF & VIEW RECEIPT
- Visual: The merchant clicks "Download PDF". A high-resolution PDF tax invoice document downloads and opens up on the screen in crystal-clear vector fidelity, showing the official Merchant X header, luxury gold foil ribbon, complete cryptographic proof, and zero processor fee confirmation.
- Audio Narration: "The merchant clicks 'Download PDF'. The official invoice downloads immediately, opens up, and displays the complete high-resolution cryptographic PDF receipt ready for accounting and customer records."
================================================================================
`;

export const VideoPromptDrawer: React.FC<VideoPromptDrawerProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_AI_VIDEO_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0d0f18] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141724] border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-display">
                  Full AI Video Generation Prompt
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold rounded-full">
                  13-Scene Production Script
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Complete Prompt & Video Director Script
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Prompt!' : 'Copy Full AI Prompt'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORE RULES BANNER */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Core Rule Enforced:</strong> Merchant X is merchant-side only. Customers pay using Bitcoin.com Wallet exclusively with zero customer-side login.
          </span>
        </div>

        {/* PROMPT CONTENT VIEWER */}
        <div className="flex-1 p-5 overflow-y-auto bg-[#090b12] text-zinc-300 font-mono text-xs leading-relaxed space-y-4">
          <div className="p-4 bg-[#121522] border border-zinc-800 rounded-2xl space-y-2">
            <div className="text-amber-400 font-bold flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" />
              <span>Cinematography & Engine Compatibility</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Ready for copy-pasting directly into OpenAI Sora, Runway Gen-3 Alpha, Kling AI, Luma Dream Machine, Pika Labs, Midjourney, and ElevenLabs text-to-speech pipelines.
            </p>
          </div>

          <pre className="whitespace-pre-wrap font-mono text-zinc-200 text-xs bg-[#0f121d] p-4 rounded-2xl border border-zinc-800/80 select-all overflow-x-auto">
            {FULL_AI_VIDEO_PROMPT_TEXT}
          </pre>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-[#141724] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>13 Authentic Scenes • VERSE Payment • Bitcoin.com Wallet • All Chain Logos</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            {copied ? '✓ Prompt Copied to Clipboard' : 'Click to copy full text'}
          </button>
        </div>
      </div>
    </div>
  );
};
