import React, { useState } from 'react';
import {
  SubscriptionState,
  SubscriptionRecord,
  WalletState,
  CryptoAsset,
  TransactionRecord,
} from '../types/merchant';
import {
  PRO_PRICE_USD,
  FREE_MONTHLY_LIMIT,
  EXPLORER_URLS,
} from '../config/constants';
import { formatAddress, formatCryptoAmount } from '../services/blockchainService';
import { ProPaymentModal } from './ProPaymentModal';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface SubscriptionProps {
  subscriptionState: SubscriptionState;
  transactions: TransactionRecord[];
  walletState: WalletState;
  onOpenWalletModal: () => void;
  cryptoRatesUsd: Record<CryptoAsset, number>;
  onSubscriptionSuccess: (record: SubscriptionRecord) => void;
  language?: string;
}

export const Subscription: React.FC<SubscriptionProps> = ({
  subscriptionState,
  transactions,
  walletState,
  onOpenWalletModal,
  cryptoRatesUsd,
  onSubscriptionSuccess,
  language = 'en',
}) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // Check if Pro is active
  const isPro =
    subscriptionState.plan === 'pro' &&
    !!subscriptionState.proExpiresAt &&
    subscriptionState.proExpiresAt > Date.now();

  // Calculate monthly transactions for Free plan
  const periodStart = subscriptionState.currentPeriodStart || Date.now() - 30 * 24 * 60 * 60 * 1000;
  const successfulThisPeriod = transactions.filter(
    (tx) => tx.status === 'paid' && tx.timestamp >= periodStart
  ).length;

  const freeTransactionsUsed = Math.min(successfulThisPeriod, FREE_MONTHLY_LIMIT);
  const freeTransactionsRemaining = Math.max(0, FREE_MONTHLY_LIMIT - successfulThisPeriod);
  const usagePercentage = Math.min(100, Math.round((freeTransactionsUsed / FREE_MONTHLY_LIMIT) * 100));

  // Expiry date calculation for Pro
  const expiryDate = subscriptionState.proExpiresAt
    ? new Date(subscriptionState.proExpiresAt)
    : null;

  const daysRemaining = subscriptionState.proExpiresAt
    ? Math.max(0, Math.ceil((subscriptionState.proExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleOpenUpgrade = () => {
    setIsRenewing(false);
    setIsPaymentModalOpen(true);
  };

  const handleOpenRenew = () => {
    setIsRenewing(true);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 pb-24 space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-white flex items-center gap-2">
            <span>Subscription</span>
            {isPro && (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase rounded-full">
                PRO ACTIVE ✓
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Transparent, non-custodial Web3 billing for your merchant terminal
          </p>
        </div>

        <div className="p-2 rounded-2xl bg-[#141622] border border-zinc-800 text-amber-400">
          <Sparkles className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Current Plan Status Card */}
      {isPro ? (
        /* PRO ACTIVE CARD */
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#1a1728] via-[#121420] to-[#0d0e15] border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3 h-3" />
                <span>PRO ACTIVE ✓</span>
              </div>
              <h2 className="text-2xl font-black font-display text-white mt-1">
                Merchant X Pro Plan
              </h2>
              <p className="text-xs text-amber-200/80">
                Unlimited transactions and premium enterprise merchant features enabled.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded-lg">
                Active
              </span>
            </div>
          </div>

          {/* Pro Expiry & Limits Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-xs">
            <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Plan Expiry</span>
              </div>
              <div className="font-bold text-white text-sm">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {expiryDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Monthly Limit</span>
              </div>
              <div className="font-bold text-amber-400 text-sm">
                Unlimited
              </div>
              <div className="text-[10px] text-zinc-400">
                0 extra transaction fees
              </div>
            </div>
          </div>

          {/* Renew Button */}
          <button
            type="button"
            onClick={handleOpenRenew}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Renew Pro for $10 / Month</span>
          </button>
        </div>
      ) : (
        /* FREE PLAN CARD */
        <div className="p-5 rounded-2xl bg-[#12141d] border border-zinc-800 shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                Current Tier
              </div>
              <h2 className="text-xl font-extrabold font-display text-white mt-1">
                Merchant X Free Plan
              </h2>
              <p className="text-xs text-zinc-400">
                10 successful transactions per month with basic on-chain receipts.
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-display text-zinc-200">
                $0
              </span>
              <span className="text-[10px] text-zinc-400 block font-mono">
                / month
              </span>
            </div>
          </div>

          {/* Usage Meter */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">
                Monthly Transactions:
              </span>
              <span className="font-mono font-bold text-white">
                {freeTransactionsUsed} / {FREE_MONTHLY_LIMIT} used
                <span className="text-amber-400 ml-1">
                  ({freeTransactionsRemaining} remaining)
                </span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-zinc-800/80 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercentage >= 100
                    ? 'bg-red-500'
                    : usagePercentage >= 70
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(4, usagePercentage)}%` }}
              />
            </div>

            {freeTransactionsRemaining === 0 ? (
              <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  You have reached your 10 free monthly transactions. Upgrade to Pro for unlimited volume.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400">
                Resets automatically at the end of your 30-day billing cycle.
              </p>
            )}
          </div>

          {/* Upgrade Primary Call to Action */}
          <button
            type="button"
            onClick={handleOpenUpgrade}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-black text-sm uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ring-2 ring-amber-500/20"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Upgrade to Pro — $10 / Month</span>
          </button>
        </div>
      )}

      {/* 3. Plan Comparison Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 px-1">
          Plan Features & Limits
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Free Card */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between ${
              !isPro
                ? 'bg-[#141620] border-zinc-700/80 shadow-sm'
                : 'bg-[#0f1017] border-zinc-800/80 text-zinc-400'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Free Tier
              </div>
              <div className="text-xl font-black text-white mt-0.5 font-display">
                $0 <span className="text-xs text-zinc-400 font-normal">/ mo</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-start gap-1.5 text-zinc-300">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>10 successful tx / mo</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-300">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Basic POS receipts</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-400">
                  <span className="text-zinc-500 font-bold">•</span>
                  <span>Auto-resets monthly</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-400">
                  <span className="text-zinc-600 font-bold">✕</span>
                  <span>Custom themes & notes (Pro)</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-400">
                  <span className="text-zinc-600 font-bold">✕</span>
                  <span>Requires Pro after 10 tx</span>
                </li>
              </ul>
            </div>
            {!isPro && (
              <div className="mt-4 pt-2 border-t border-zinc-800 text-[10px] font-bold text-center text-zinc-400">
                CURRENT PLAN
              </div>
            )}
          </div>

          {/* Pro Card */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between relative overflow-hidden ${
              isPro
                ? 'bg-gradient-to-b from-amber-500/15 via-[#181a24] to-[#12141c] border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                : 'bg-[#161824] border-amber-500/40 shadow-sm'
            }`}
          >
            {/* Top highlight ribbon */}
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase rounded-bl-lg">
              POPULAR
            </div>

            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Pro Tier</span>
              </div>
              <div className="text-xl font-black text-amber-300 mt-0.5 font-display">
                $10 <span className="text-xs text-zinc-400 font-normal">/ mo</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-start gap-1.5 text-white font-semibold">
                  <span className="text-amber-400 font-black">✓</span>
                  <span>Unlimited transactions</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-200">
                  <span className="text-amber-400 font-black">✓</span>
                  <span>Vector PDF Statements</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-200">
                  <span className="text-amber-400 font-black">✓</span>
                  <span>Analytics & History</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-200">
                  <span className="text-amber-400 font-black">✓</span>
                  <span>Custom receipts</span>
                </li>
                <li className="flex items-start gap-1.5 text-zinc-200">
                  <span className="text-amber-400 font-black">✓</span>
                  <span>Instant direct wallet settlement</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-2 border-t border-amber-500/20">
              {isPro ? (
                <div className="text-[10px] font-black text-center text-amber-400 uppercase">
                  ACTIVE UNTIL {expiryDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenUpgrade}
                  className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Subscription Payment History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 px-1 flex items-center justify-between">
          <span>Subscription Payment History</span>
          <span className="text-xs text-zinc-400 font-mono font-normal">
            {subscriptionState.history?.length || 0} recorded
          </span>
        </h3>

        {subscriptionState.history && subscriptionState.history.length > 0 ? (
          <div className="space-y-2">
            {subscriptionState.history.map((record) => {
              const explorerBase = EXPLORER_URLS[record.network] || 'https://polygonscan.com';
              return (
                <div
                  key={record.id}
                  className="p-3.5 bg-[#12141d] border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white uppercase">
                        Pro Subscription (30 Days)
                      </span>
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[9px] rounded">
                        CONFIRMED ✓
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {record.formattedDate} {record.formattedTime} • {record.network}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono font-bold text-amber-400">
                      {record.cryptoAmount} {record.cryptoAsset} ($10.00)
                    </div>
                    <a
                      href={`${explorerBase}/tx/${record.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-zinc-400 hover:text-amber-400 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      <span>{formatAddress(record.txHash, 4)}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-[#11131a] border border-zinc-800/80 rounded-xl text-center text-zinc-400 text-xs">
            No on-chain subscription payments recorded yet. Upgrade to Pro to activate unlimited monthly transactions.
          </div>
        )}
      </div>

      {/* 6. Pro Payment Modal */}
      <ProPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        walletState={walletState}
        onOpenWalletModal={onOpenWalletModal}
        cryptoRatesUsd={cryptoRatesUsd}
        onSubscriptionSuccess={(record) => {
          onSubscriptionSuccess(record);
        }}
        isRenewing={isRenewing}
      />
    </div>
  );
};
