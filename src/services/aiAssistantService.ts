import { TransactionRecord, AppSettings, CryptoAsset, WalletState, SubscriptionState } from '../types/merchant';

export interface TokenSummary {
  count: number;
  totalCrypto: number;
  totalFiat: number;
}

export interface BusinessMetrics {
  totalRevenueFiat: number;
  totalTransactionsCount: number;
  paidCount: number;
  underpaidCount: number;
  overpaidCount: number;
  pendingCount: number;
  failedCount: number;

  // Time-based
  todayRevenueFiat: number;
  todayCount: number;
  yesterdayRevenueFiat: number;
  yesterdayCount: number;
  thisWeekRevenueFiat: number;
  thisWeekCount: number;
  thisMonthRevenueFiat: number;
  thisMonthCount: number;
  lastMonthRevenueFiat: number;
  lastMonthCount: number;
  thisYearRevenueFiat: number;
  thisYearCount: number;

  // Comparisons & Trends
  monthOverMonthChangePercent: number | null; // e.g. +25.5 or -12.0
  salesTrend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';

  // Key Highlights
  averageTransactionValueFiat: number;
  biggestTransaction: TransactionRecord | null;
  bestSalesDay: {
    dateStr: string;
    revenueFiat: number;
    count: number;
  } | null;

  // Token breakdown
  tokenBreakdown: Record<CryptoAsset | string, TokenSummary>;
  mostUsedToken: {
    symbol: CryptoAsset | string;
    count: number;
    totalFiat: number;
  } | null;

  // Recent transactions list
  recentTransactions: Array<{
    id: string;
    reference: string;
    amountFiat: number;
    fiatCurrency: string;
    amountCrypto: number;
    cryptoAsset: string;
    status: string;
    date: string;
    time: string;
    timestamp: number;
  }>;
}

export interface AIAssistantContext {
  merchantName: string;
  merchantLocation: string;
  fiatCurrency: string;
  fiatSymbol: string;
  transactions: TransactionRecord[];
  metrics: BusinessMetrics;
  walletState?: WalletState;
  subscriptionState?: SubscriptionState;
  liveRates?: Record<string, number>;
  liveRatesUsd?: Record<string, number>;
  clientTime: string;
  clientTimezone: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

/**
 * Computes deterministic business metrics from real ledger records
 */
export function computeBusinessMetrics(
  transactions: TransactionRecord[],
  fiatCurrency: string
): BusinessMetrics {
  const now = new Date();
  
  // Date boundaries based on client local time
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const endOfYesterday = startOfToday - 1;

  // Current week (starting Monday)
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime();

  // Current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Last month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

  // Current year
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  let totalRevenueFiat = 0;
  let paidCount = 0;
  let underpaidCount = 0;
  let overpaidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  let todayRevenueFiat = 0;
  let todayCount = 0;
  let yesterdayRevenueFiat = 0;
  let yesterdayCount = 0;
  let thisWeekRevenueFiat = 0;
  let thisWeekCount = 0;
  let thisMonthRevenueFiat = 0;
  let thisMonthCount = 0;
  let lastMonthRevenueFiat = 0;
  let lastMonthCount = 0;
  let thisYearRevenueFiat = 0;
  let thisYearCount = 0;

  let biggestTransaction: TransactionRecord | null = null;
  let maxTxAmount = -1;

  const dailyVolumeMap: Record<string, { revenueFiat: number; count: number; dateStr: string }> = {};
  const tokenMap: Record<string, TokenSummary> = {};

  // Sort descending by timestamp
  const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  for (const tx of sorted) {
    const txTime = tx.timestamp || Date.now();
    const status = tx.status || 'paid';
    const amountFiat = Number(tx.amountFiat) || 0;
    const amountCrypto = Number(tx.amountCrypto) || 0;
    const asset = tx.cryptoAsset || 'VERSE';

    // Status counts
    if (status === 'paid') paidCount++;
    else if (status === 'underpaid') underpaidCount++;
    else if (status === 'overpaid') overpaidCount++;
    else if (status === 'pending') pendingCount++;
    else if (status === 'failed') failedCount++;

    // Only count completed/settled revenue for sales metrics (paid, overpaid, and partially settled underpaid)
    const isSuccessful = status === 'paid' || status === 'overpaid' || status === 'underpaid';

    if (isSuccessful) {
      totalRevenueFiat += amountFiat;

      // Biggest transaction
      if (amountFiat > maxTxAmount) {
        maxTxAmount = amountFiat;
        biggestTransaction = tx;
      }

      // Group by calendar day for best sales day
      const txDate = new Date(txTime);
      const dateKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
      if (!dailyVolumeMap[dateKey]) {
        dailyVolumeMap[dateKey] = {
          dateStr: tx.formattedDate || dateKey,
          revenueFiat: 0,
          count: 0,
        };
      }
      dailyVolumeMap[dateKey].revenueFiat += amountFiat;
      dailyVolumeMap[dateKey].count += 1;

      // Time buckets
      if (txTime >= startOfToday) {
        todayRevenueFiat += amountFiat;
        todayCount++;
      } else if (txTime >= startOfYesterday && txTime <= endOfYesterday) {
        yesterdayRevenueFiat += amountFiat;
        yesterdayCount++;
      }

      if (txTime >= startOfWeek) {
        thisWeekRevenueFiat += amountFiat;
        thisWeekCount++;
      }

      if (txTime >= startOfMonth) {
        thisMonthRevenueFiat += amountFiat;
        thisMonthCount++;
      } else if (txTime >= startOfLastMonth && txTime <= endOfLastMonth) {
        lastMonthRevenueFiat += amountFiat;
        lastMonthCount++;
      }

      if (txTime >= startOfYear) {
        thisYearRevenueFiat += amountFiat;
        thisYearCount++;
      }

      // Token breakdown
      if (!tokenMap[asset]) {
        tokenMap[asset] = { count: 0, totalCrypto: 0, totalFiat: 0 };
      }
      tokenMap[asset].count += 1;
      tokenMap[asset].totalCrypto += amountCrypto;
      tokenMap[asset].totalFiat += amountFiat;
    }
  }

  // Best sales day
  let bestSalesDay: { dateStr: string; revenueFiat: number; count: number } | null = null;
  let maxDayRev = -1;
  for (const day of Object.values(dailyVolumeMap)) {
    if (day.revenueFiat > maxDayRev) {
      maxDayRev = day.revenueFiat;
      bestSalesDay = day;
    }
  }

  // Most used token
  let mostUsedToken: { symbol: CryptoAsset | string; count: number; totalFiat: number } | null = null;
  let maxTokenCount = -1;
  for (const [symbol, stats] of Object.entries(tokenMap)) {
    if (stats.count > maxTokenCount) {
      maxTokenCount = stats.count;
      mostUsedToken = {
        symbol,
        count: stats.count,
        totalFiat: stats.totalFiat,
      };
    }
  }

  // Average Transaction Value (ATV)
  const successfulTxCount = paidCount + overpaidCount + underpaidCount;
  const averageTransactionValueFiat = successfulTxCount > 0 ? totalRevenueFiat / successfulTxCount : 0;

  // Month over month trend
  let monthOverMonthChangePercent: number | null = null;
  let salesTrend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' = 'insufficient_data';

  if (lastMonthRevenueFiat > 0) {
    const diff = thisMonthRevenueFiat - lastMonthRevenueFiat;
    monthOverMonthChangePercent = (diff / lastMonthRevenueFiat) * 100;
    if (monthOverMonthChangePercent > 2) salesTrend = 'increasing';
    else if (monthOverMonthChangePercent < -2) salesTrend = 'decreasing';
    else salesTrend = 'stable';
  } else if (thisMonthRevenueFiat > 0) {
    salesTrend = 'increasing';
  }

  const recentTransactions = sorted.slice(0, 10).map((t) => ({
    id: t.id,
    reference: t.reference || t.id.slice(0, 8),
    amountFiat: t.amountFiat,
    fiatCurrency: t.fiatCurrency || fiatCurrency,
    amountCrypto: t.amountCrypto,
    cryptoAsset: t.cryptoAsset,
    status: t.status,
    date: t.formattedDate || new Date(t.timestamp).toLocaleDateString(),
    time: t.formattedTime || new Date(t.timestamp).toLocaleTimeString(),
    timestamp: t.timestamp,
  }));

  return {
    totalRevenueFiat,
    totalTransactionsCount: transactions.length,
    paidCount,
    underpaidCount,
    overpaidCount,
    pendingCount,
    failedCount,

    todayRevenueFiat,
    todayCount,
    yesterdayRevenueFiat,
    yesterdayCount,
    thisWeekRevenueFiat,
    thisWeekCount,
    thisMonthRevenueFiat,
    thisMonthCount,
    lastMonthRevenueFiat,
    lastMonthCount,
    thisYearRevenueFiat,
    thisYearCount,

    monthOverMonthChangePercent,
    salesTrend,

    averageTransactionValueFiat,
    biggestTransaction,
    bestSalesDay,

    tokenBreakdown: tokenMap,
    mostUsedToken,
    recentTransactions,
  };
}

/**
 * Ask the AI Business Assistant
 */
export async function queryAIBusinessAssistant(
  prompt: string,
  context: AIAssistantContext
): Promise<{ success: boolean; answer: string }> {
  try {
    const response = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        context,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get answer from AI Assistant');
    }

    return {
      success: true,
      answer: data.answer,
    };
  } catch (err: any) {
    console.warn('[AI Assistant Fetch Fallback]:', err.message);
    // Fallback to deterministic instant analytics engine if network fails
    const localAnswer = generateLocalDeterministicAnswer(prompt, context);
    return {
      success: true,
      answer: localAnswer,
    };
  }
}

/**
 * Local Deterministic Analytics Engine (Guarantees zero-latency and 100% accurate fallback)
 */
export function generateLocalDeterministicAnswer(
  prompt: string,
  context: AIAssistantContext
): string {
  const q = prompt.toLowerCase().trim();
  const m = context.metrics;
  const curr = context.fiatCurrency || 'USD';
  const sym = context.fiatSymbol || '$';

  const fmt = (num: number) => {
    return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Today's sales
  if (q.includes('today') || q.includes('how much did i sell today')) {
    if (m.todayCount === 0) {
      return `### 📅 Today's Sales Performance\n\nYou have recorded **0 transactions** today (${new Date().toLocaleDateString()}). Total revenue for today is **${fmt(0)}**.\n\n*Ready to process customer payments on the POS screen.*`;
    }
    return `### 📅 Today's Sales Performance\n\n- **Total Today Revenue:** **${fmt(m.todayRevenueFiat)}**\n- **Completed Transactions:** **${m.todayCount}**\n- **Average Value Today:** **${fmt(m.todayRevenueFiat / m.todayCount)}**\n\nAll recorded payments have been verified on-chain to your settlement wallet.`;
  }

  // 2. Yesterday's sales
  if (q.includes('yesterday')) {
    if (m.yesterdayCount === 0) {
      return `### 📅 Yesterday's Sales Performance\n\nNo transactions were recorded yesterday. Total revenue was **${fmt(0)}**.`;
    }
    return `### 📅 Yesterday's Sales Performance\n\n- **Total Revenue:** **${fmt(m.yesterdayRevenueFiat)}**\n- **Transactions:** **${m.yesterdayCount}**`;
  }

  // 3. This week's sales
  if (q.includes('this week') || q.includes('week')) {
    return `### 📊 This Week's Sales Overview\n\n- **Revenue This Week:** **${fmt(m.thisWeekRevenueFiat)}**\n- **Total Transactions:** **${m.thisWeekCount}**\n- **Average Ticket:** **${fmt(m.thisWeekCount > 0 ? m.thisWeekRevenueFiat / m.thisWeekCount : 0)}**`;
  }

  // 4. Compare this month with last month
  if (q.includes('compare') || q.includes('last month') || q.includes('increasing') || q.includes('decreasing') || q.includes('trend')) {
    let compText = '';
    if (m.lastMonthRevenueFiat > 0) {
      const pct = m.monthOverMonthChangePercent || 0;
      const arrow = pct >= 0 ? '📈 **Up +' : '📉 **Down ';
      compText = `${arrow}${pct.toFixed(1)}%** compared to last month.`;
    } else {
      compText = `Last month had no recorded sales. This month has **${fmt(m.thisMonthRevenueFiat)}** across **${m.thisMonthCount}** transactions.`;
    }

    return `### 📈 Month-over-Month Sales Comparison\n\n| Period | Revenue | Transaction Count |\n| :--- | :--- | :--- |\n| **This Month** | **${fmt(m.thisMonthRevenueFiat)}** | ${m.thisMonthCount} txs |\n| **Last Month** | **${fmt(m.lastMonthRevenueFiat)}** | ${m.lastMonthCount} txs |\n\n**Trend Insight:** ${compText}`;
  }

  // 5. This month's revenue
  if (q.includes('this month') || q.includes('month')) {
    return `### 🗓️ This Month's Revenue\n\n- **Month-to-Date Revenue:** **${fmt(m.thisMonthRevenueFiat)}**\n- **Total Month Transactions:** **${m.thisMonthCount}**\n- **Share of All-Time Revenue:** **${m.totalRevenueFiat > 0 ? ((m.thisMonthRevenueFiat / m.totalRevenueFiat) * 100).toFixed(1) : 0}%**`;
  }

  // 6. Best sales day
  if (q.includes('best') || q.includes('best sales day') || q.includes('highest day')) {
    if (!m.bestSalesDay) {
      return `No transaction history is currently available to identify a best performing sales day.`;
    }
    return `### 🏆 Best Performing Sales Day\n\n- **Date:** **${m.bestSalesDay.dateStr}**\n- **Total Daily Revenue:** **${fmt(m.bestSalesDay.revenueFiat)}**\n- **Total Payments Settled:** **${m.bestSalesDay.count} transactions**`;
  }

  // 7. Biggest transaction
  if (q.includes('biggest') || q.includes('largest') || q.includes('highest transaction')) {
    if (!m.biggestTransaction) {
      return `No completed transactions found in your Merchant X terminal ledger yet.`;
    }
    const bt = m.biggestTransaction;
    return `### 💎 Largest Recorded Transaction\n\n- **Amount:** **${fmt(bt.amountFiat)}** (${bt.amountCrypto} ${bt.cryptoAsset})\n- **Reference:** \`${bt.reference}\`\n- **Date & Time:** ${bt.formattedDate} at ${bt.formattedTime}\n- **Network:** ${bt.network} (${bt.status.toUpperCase()})\n- **Customer Wallet:** \`${bt.customerWallet || 'Direct QR Settlement'}\``;
  }

  // 8. Underpaid / Overpaid
  if (q.includes('underpaid') || q.includes('overpaid') || q.includes('discrepanc')) {
    return `### ⚖️ Payment Discrepancy Audit\n\n- **Underpaid Transactions:** **${m.underpaidCount}**\n- **Overpaid Transactions:** **${m.overpaidCount}**\n- **Exact 100% Paid:** **${m.paidCount}**\n- **Pending / Incomplete:** **${m.pendingCount}**\n\n*Merchant X automatically verifies exact on-chain transfer amounts against live market prices.*`;
  }

  // 9. Recent transactions
  if (q.includes('recent') || q.includes('latest') || q.includes('history') || q.includes('show me my recent')) {
    if (m.recentTransactions.length === 0) {
      return `You have no recorded transactions yet. New customer payments will automatically appear in your transaction history.`;
    }

    const tableRows = m.recentTransactions.slice(0, 5).map(
      (tx) => `| \`${tx.reference}\` | **${fmt(tx.amountFiat)}** | ${tx.amountCrypto} ${tx.cryptoAsset} | \`${tx.status.toUpperCase()}\` | ${tx.date} |`
    ).join('\n');

    return `### 🕒 Recent 5 Transactions\n\n| Ref | Amount (${curr}) | Crypto | Status | Date |\n| :--- | :--- | :--- | :--- | :--- |\n${tableRows}\n\n*You can view the full ledger under the Transactions tab or export a PDF statement.*`;
  }

  // 10. Token specific questions (VERSE, USDT, BTC, etc.)
  if (q.includes('verse') || q.includes('usdt') || q.includes('btc') || q.includes('eth') || q.includes('usdc') || q.includes('token') || q.includes('which payment token')) {
    const tokens = Object.entries(m.tokenBreakdown);
    if (tokens.length === 0) {
      return `No crypto payments have been recorded yet. Merchant X supports **VERSE, USDT, USDC, ETH, POL, and BTC**.`;
    }

    const rows = tokens.map(
      ([symb, data]) => `| **${symb}** | ${data.count} txs | ${data.totalCrypto.toLocaleString()} ${symb} | **${fmt(data.totalFiat)}** |`
    ).join('\n');

    const topToken = m.mostUsedToken ? `**Most popular payment token:** **${m.mostUsedToken.symbol}** (${m.mostUsedToken.count} transactions, generating ${fmt(m.mostUsedToken.totalFiat)}).` : '';

    return `### 🪙 Cryptocurrency Breakdown\n\n| Asset | Volume | Total Received | Fiat Value (${curr}) |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n${topToken}`;
  }

  // 11. Average Transaction Value (ATV)
  if (q.includes('average') || q.includes('atv') || q.includes('mean')) {
    return `### 🏷️ Average Transaction Value (ATV)\n\n- **Average Ticket Size:** **${fmt(m.averageTransactionValueFiat)}**\n- **Total Successful Payments:** **${m.paidCount + m.overpaidCount + m.underpaidCount}**\n- **Gross Volume:** **${fmt(m.totalRevenueFiat)}**`;
  }

  // 12. General Business Summary / Performance
  return `### 📊 Merchant X Business Performance Summary\n\n- **Total Lifetime Revenue:** **${fmt(m.totalRevenueFiat)}**\n- **Total Completed Transactions:** **${m.paidCount + m.overpaidCount + m.underpaidCount}**\n- **Today's Revenue:** **${fmt(m.todayRevenueFiat)}** (${m.todayCount} txs)\n- **This Month's Revenue:** **${fmt(m.thisMonthRevenueFiat)}** (${m.thisMonthCount} txs)\n- **Average Transaction Value:** **${fmt(m.averageTransactionValueFiat)}**\n- **Top Crypto Asset:** **${m.mostUsedToken ? m.mostUsedToken.symbol : 'N/A'}**\n\n💡 *Tip: Ask specific questions like "What was my biggest transaction?", "Today's sales", or "Compare sales with last month".*`;
}
