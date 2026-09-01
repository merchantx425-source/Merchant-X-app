import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// Body parser for JSON
app.use(express.json());

// Real in-memory ratings store (persisted during server session)
interface RatingRecord {
  id: string;
  stars: number; // 1 to 5
  category?: string;
  comment?: string;
  merchantName?: string;
  email?: string;
  timestamp: string;
}

let storedRatings: RatingRecord[] = [];

/**
 * AI Business Assistant Endpoint
 * Connects to Gemini API server-side using @google/genai SDK with gemini-3.7-flash
 */
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid question or prompt.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const cleanPrompt = prompt.trim();
    const currSym = context?.fiatSymbol || '$';
    const currCode = context?.fiatCurrency || 'USD';
    const clientTime = context?.clientTime || new Date().toISOString();
    const m = context?.metrics || {};

    if (!apiKey) {
      // Return structured answer from deterministic analytics engine when GEMINI_API_KEY is not set
      const fallbackAnswer = generateServerAnalyticsAnswer(cleanPrompt, context);
      return res.status(200).json({
        success: true,
        answer: fallbackAnswer,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are the Merchant X AI Business Assistant — an intelligent, read-only analytics and financial advisor built inside the Merchant X non-custodial POS terminal.
Your purpose is to answer merchant questions regarding their real sales, payments, transactions, revenue, tokens, customer volumes, and analytics with 100% precision and truthfulness.

CRITICAL ZERO-FAKE-DATA & ACCURACY RULES:
1. STRICTLY REAL DATA ONLY: Rely ONLY and EXCLUSIVELY on the merchant's real business metrics, connected wallet addresses, real token balances, and ledger transactions provided below.
2. ZERO HALLUCINATION & ZERO FAKE DATA:
   - If the merchant has 0 transactions (Total Transactions Count: 0), YOU MUST STATE EXPLICITLY that they have 0 transactions recorded and $0.00 revenue so far. Explain that once they charge customers via the POS keypad or QR codes, real analytics will automatically populate here.
   - NEVER invent, simulate, hypothesize, or generate sample/mock/demo transaction records, test customers, or imaginary revenue numbers.
   - If asked about a date, token, or period with 0 transactions, explicitly say there are no transactions recorded for that period.
3. READ-ONLY SCOPE: You are strictly read-only. You cannot alter wallet keys, change balances, delete transactions, or modify system settings.
4. TEMPORAL ACCURACY: Understand relative dates relative to the merchant's local current time:
   - Client Local Time: ${clientTime}
   - "today": transactions recorded on the current calendar day.
   - "yesterday": transactions recorded on the previous calendar day.
   - "this week": transactions since Monday of the current week.
   - "this month": transactions from the 1st of the current month until now.
   - "last month": transactions during the previous calendar month.
   - "this year": transactions since Jan 1st of the current year.
5. FORMATTING & CLARITY:
   - Format monetary numbers clearly with symbols (e.g. ${currSym}1,250.00 ${currCode}) and token quantities (e.g. 50,000 VERSE, 120.50 USDT).
   - Use clean Markdown formatting: headings, bold metric values, compact markdown tables, and bullet points.
   - For comparisons (e.g., this month vs last month), present a clean side-by-side table and explain whether revenue is increasing or decreasing.
   - For business insights or "What should I pay attention to?", give actionable, professional observations based on real payment token mix, average transaction value, or discrepancies (underpaid/overpaid).

MERCHANT REAL BUSINESS CONTEXT & PRE-CALCULATED LEDGER METRICS:
- Merchant Name: ${context?.merchantName || 'Merchant X Terminal'}
- Store Location: ${context?.merchantLocation || 'Global'}
- Display Currency: ${currCode} (${currSym})
- All-Time Total Revenue: ${currSym}${Number(m.totalRevenueFiat || 0).toLocaleString()}
- Total Transactions Count: ${m.totalTransactionsCount || 0}
- Completed Paid Transactions: ${m.paidCount || 0}
- Underpaid Payments: ${m.underpaidCount || 0}
- Overpaid Payments: ${m.overpaidCount || 0}
- Pending Transactions: ${m.pendingCount || 0}
- Failed Transactions: ${m.failedCount || 0}

TIMEFRAME REVENUE BREAKDOWN:
- Today's Sales: ${currSym}${Number(m.todayRevenueFiat || 0).toLocaleString()} (${m.todayCount || 0} txs)
- Yesterday's Sales: ${currSym}${Number(m.yesterdayRevenueFiat || 0).toLocaleString()} (${m.yesterdayCount || 0} txs)
- This Week's Sales: ${currSym}${Number(m.thisWeekRevenueFiat || 0).toLocaleString()} (${m.thisWeekCount || 0} txs)
- This Month's Sales: ${currSym}${Number(m.thisMonthRevenueFiat || 0).toLocaleString()} (${m.thisMonthCount || 0} txs)
- Last Month's Sales: ${currSym}${Number(m.lastMonthRevenueFiat || 0).toLocaleString()} (${m.lastMonthCount || 0} txs)
- This Year's Sales: ${currSym}${Number(m.thisYearRevenueFiat || 0).toLocaleString()} (${m.thisYearCount || 0} txs)
- Month-over-Month Change: ${m.monthOverMonthChangePercent != null ? m.monthOverMonthChangePercent.toFixed(1) + '%' : 'N/A'} (Trend: ${m.salesTrend || 'N/A'})

BUSINESS HIGHLIGHTS:
- Average Transaction Value (ATV): ${currSym}${Number(m.averageTransactionValueFiat || 0).toLocaleString()}
- Best Sales Day: ${m.bestSalesDay ? `${m.bestSalesDay.dateStr} with ${currSym}${Number(m.bestSalesDay.revenueFiat).toLocaleString()} (${m.bestSalesDay.count} txs)` : 'No sales day recorded yet'}
- Largest Single Transaction: ${m.biggestTransaction ? `${currSym}${Number(m.biggestTransaction.amountFiat).toLocaleString()} (${m.biggestTransaction.amountCrypto} ${m.biggestTransaction.cryptoAsset}) on ${m.biggestTransaction.formattedDate}` : 'None'}
- Most Used Payment Token: ${m.mostUsedToken ? `${m.mostUsedToken.symbol} (${m.mostUsedToken.count} payments, ${currSym}${Number(m.mostUsedToken.totalFiat).toLocaleString()})` : 'None'}

TOKEN BREAKDOWN:
${JSON.stringify(m.tokenBreakdown || {}, null, 2)}

RECENT REAL TRANSACTIONS:
${JSON.stringify(m.recentTransactions || [], null, 2)}

CONNECTED SETTLEMENT WALLETS:
- EVM Address: ${context?.walletState?.evmAddress || 'Not connected'}
- Bitcoin Address: ${context?.walletState?.btcAddress || 'Not connected'}
- Wallet Provider: ${context?.walletState?.walletProvider || 'None'}
- Subscription Plan: ${context?.subscriptionState?.plan || 'Free'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: cleanPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const answer = response.text || generateServerAnalyticsAnswer(cleanPrompt, context);

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (err: any) {
    console.error('[AI Assistant Server Error]:', err.message || err);
    // Fallback to local server analytics on any transient error
    const fallbackAnswer = generateServerAnalyticsAnswer(req.body?.prompt || '', req.body?.context || {});
    return res.status(200).json({
      success: true,
      answer: fallbackAnswer,
    });
  }
});

/**
 * Server-side Deterministic Analytics Engine for fallback answers
 */
function generateServerAnalyticsAnswer(prompt: string, context: any): string {
  const q = (prompt || '').toLowerCase().trim();
  const m = context?.metrics || {};
  const sym = context?.fiatSymbol || '$';
  const curr = context?.fiatCurrency || 'USD';

  const fmt = (val: number) => {
    return `${sym}${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (q.includes('today')) {
    if (!m.todayCount) {
      return `### 📅 Today's Sales Performance\n\nYou have recorded **0 transactions** today. Total sales today is **${fmt(0)}**.\n\n*Transactions processed on the POS screen will update this figure immediately.*`;
    }
    return `### 📅 Today's Sales Performance\n\n- **Today's Revenue:** **${fmt(m.todayRevenueFiat)}**\n- **Transactions Completed:** **${m.todayCount}**\n- **Average Ticket Today:** **${fmt(m.todayRevenueFiat / m.todayCount)}**`;
  }

  if (q.includes('yesterday')) {
    return `### 📅 Yesterday's Sales Performance\n\n- **Revenue:** **${fmt(m.yesterdayRevenueFiat)}**\n- **Transactions:** **${m.yesterdayCount || 0}**`;
  }

  if (q.includes('this week') || q.includes('week')) {
    return `### 📊 This Week's Sales\n\n- **Revenue This Week:** **${fmt(m.thisWeekRevenueFiat)}**\n- **Transactions Count:** **${m.thisWeekCount || 0}**`;
  }

  if (q.includes('this month') || (q.includes('month') && !q.includes('last month') && !q.includes('compare'))) {
    return `### 🗓️ This Month's Revenue\n\n- **Month-to-Date Revenue:** **${fmt(m.thisMonthRevenueFiat)}**\n- **Total Transactions:** **${m.thisMonthCount || 0}**`;
  }

  if (q.includes('compare') || q.includes('last month') || q.includes('increasing') || q.includes('decreasing') || q.includes('trend')) {
    let comp = '';
    if (m.lastMonthRevenueFiat > 0) {
      const pct = m.monthOverMonthChangePercent || 0;
      comp = pct >= 0 ? `📈 **Up +${pct.toFixed(1)}%** compared to last month.` : `📉 **Down ${pct.toFixed(1)}%** compared to last month.`;
    } else {
      comp = `Last month had no recorded sales. This month has **${fmt(m.thisMonthRevenueFiat)}** across **${m.thisMonthCount || 0}** transactions.`;
    }

    return `### 📈 Month-over-Month Sales Comparison\n\n| Period | Revenue | Transactions |\n| :--- | :--- | :--- |\n| **This Month** | **${fmt(m.thisMonthRevenueFiat)}** | ${m.thisMonthCount || 0} txs |\n| **Last Month** | **${fmt(m.lastMonthRevenueFiat)}** | ${m.lastMonthCount || 0} txs |\n\n**Trend Insight:** ${comp}`;
  }

  if (q.includes('best') || q.includes('highest day')) {
    if (!m.bestSalesDay) return `No transaction records available yet to determine your best performing day.`;
    return `### 🏆 Best Performing Sales Day\n\n- **Date:** **${m.bestSalesDay.dateStr}**\n- **Daily Revenue:** **${fmt(m.bestSalesDay.revenueFiat)}**\n- **Payments Processed:** **${m.bestSalesDay.count} transactions**`;
  }

  if (q.includes('biggest') || q.includes('largest')) {
    if (!m.biggestTransaction) return `No transactions recorded yet in your terminal ledger.`;
    const bt = m.biggestTransaction;
    return `### 💎 Largest Recorded Transaction\n\n- **Amount:** **${fmt(bt.amountFiat)}** (${bt.amountCrypto} ${bt.cryptoAsset})\n- **Reference:** \`${bt.reference}\`\n- **Date:** ${bt.formattedDate} at ${bt.formattedTime}\n- **Network:** ${bt.network} (${bt.status})`;
  }

  if (q.includes('underpaid') || q.includes('overpaid') || q.includes('discrepanc')) {
    return `### ⚖️ Payment Discrepancy Overview\n\n- **Underpaid Transactions:** **${m.underpaidCount || 0}**\n- **Overpaid Transactions:** **${m.overpaidCount || 0}**\n- **Exact 100% Paid:** **${m.paidCount || 0}**\n- **Pending / Incomplete:** **${m.pendingCount || 0}**`;
  }

  if (q.includes('recent') || q.includes('latest') || q.includes('show me my recent')) {
    if (!m.recentTransactions || m.recentTransactions.length === 0) {
      return `You have no recorded transactions yet. New customer payments will automatically appear in your ledger.`;
    }
    const table = m.recentTransactions.slice(0, 5).map(
      (tx: any) => `| \`${tx.reference}\` | **${fmt(tx.amountFiat)}** | ${tx.amountCrypto} ${tx.cryptoAsset} | \`${(tx.status || 'PAID').toUpperCase()}\` | ${tx.date} |`
    ).join('\n');
    return `### 🕒 Recent 5 Transactions\n\n| Ref | Amount (${curr}) | Crypto | Status | Date |\n| :--- | :--- | :--- | :--- | :--- |\n${table}`;
  }

  if (q.includes('token') || q.includes('verse') || q.includes('usdt') || q.includes('btc') || q.includes('eth') || q.includes('usdc')) {
    const tokens = Object.entries(m.tokenBreakdown || {});
    if (tokens.length === 0) {
      return `No crypto payments have been recorded yet. Merchant X supports **VERSE, USDT, USDC, ETH, POL, and BTC**.`;
    }
    const rows = tokens.map(
      ([symb, data]: [string, any]) => `| **${symb}** | ${data.count} txs | ${data.totalCrypto} ${symb} | **${fmt(data.totalFiat)}** |`
    ).join('\n');
    return `### 🪙 Cryptocurrency Breakdown\n\n| Asset | Volume | Total Received | Fiat Value (${curr}) |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n**Most Used Token:** **${m.mostUsedToken?.symbol || 'N/A'}**`;
  }

  if (q.includes('average') || q.includes('atv')) {
    return `### 🏷️ Average Transaction Value (ATV)\n\n- **Average Ticket:** **${fmt(m.averageTransactionValueFiat)}**\n- **Total Completed Payments:** **${m.paidCount + m.overpaidCount + m.underpaidCount}**\n- **Total Revenue:** **${fmt(m.totalRevenueFiat)}**`;
  }

  return `### 📊 Merchant X Business Performance Summary\n\n- **Total Revenue:** **${fmt(m.totalRevenueFiat)}**\n- **Completed Transactions:** **${m.paidCount + m.overpaidCount + m.underpaidCount}**\n- **Today's Revenue:** **${fmt(m.todayRevenueFiat)}** (${m.todayCount || 0} txs)\n- **This Month's Revenue:** **${fmt(m.thisMonthRevenueFiat)}** (${m.thisMonthCount || 0} txs)\n- **Average Ticket Size:** **${fmt(m.averageTransactionValueFiat)}**\n- **Top Crypto Token:** **${m.mostUsedToken?.symbol || 'N/A'}**\n\n💡 *Ask specific questions like "Today's sales", "What was my biggest transaction?", or "Compare sales with last month".*`;
}

/**
 * 5-Star Ratings & Feedback Endpoints
 */
app.get('/api/feedback/ratings', (_req, res) => {
  const total = storedRatings.length;
  const count5 = storedRatings.filter((r) => r.stars === 5).length;
  const count4 = storedRatings.filter((r) => r.stars === 4).length;
  const count3 = storedRatings.filter((r) => r.stars === 3).length;
  const count2 = storedRatings.filter((r) => r.stars === 2).length;
  const count1 = storedRatings.filter((r) => r.stars === 1).length;

  const highestStarPercentage = total > 0 ? Math.round((count5 / total) * 100) : 0;
  const averageRating = total > 0 ? Number((storedRatings.reduce((acc, r) => acc + r.stars, 0) / total).toFixed(1)) : 0;

  res.json({
    success: true,
    totalRatings: total,
    highestStarPercentage,
    averageRating,
    breakdown: {
      5: { count: count5, percentage: total > 0 ? Math.round((count5 / total) * 100) : 0 },
      4: { count: count4, percentage: total > 0 ? Math.round((count4 / total) * 100) : 0 },
      3: { count: count3, percentage: total > 0 ? Math.round((count3 / total) * 100) : 0 },
      2: { count: count2, percentage: total > 0 ? Math.round((count2 / total) * 100) : 0 },
      1: { count: count1, percentage: total > 0 ? Math.round((count1 / total) * 100) : 0 },
    },
    recentReviews: storedRatings.slice(-50).reverse(),
  });
});

app.post('/api/feedback/ratings', (req, res) => {
  try {
    const { stars, category, comment, merchantName, email } = req.body;

    const starVal = Number(stars);
    if (!starVal || starVal < 1 || starVal > 5) {
      return res.status(400).json({
        success: false,
        error: 'Please select a valid star rating from 1 to 5.',
      });
    }

    const newRecord: RatingRecord = {
      id: `rate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      stars: starVal,
      category: typeof category === 'string' && category.trim() ? category.trim() : 'General',
      comment: typeof comment === 'string' && comment.trim() ? comment.trim() : undefined,
      merchantName: typeof merchantName === 'string' && merchantName.trim() ? merchantName.trim() : undefined,
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
      timestamp: new Date().toISOString(),
    };

    storedRatings.push(newRecord);

    const total = storedRatings.length;
    const count5 = storedRatings.filter((r) => r.stars === 5).length;
    const highestStarPercentage = total > 0 ? Math.round((count5 / total) * 100) : 0;
    const averageRating = total > 0 ? Number((storedRatings.reduce((acc, r) => acc + r.stars, 0) / total).toFixed(1)) : 0;

    return res.status(201).json({
      success: true,
      message: 'Thank you for your rating!',
      rating: newRecord,
      stats: {
        totalRatings: total,
        highestStarPercentage,
        averageRating,
        breakdown: {
          5: { count: count5, percentage: total > 0 ? Math.round((count5 / total) * 100) : 0 },
          4: { count: storedRatings.filter((r) => r.stars === 4).length, percentage: total > 0 ? Math.round((storedRatings.filter((r) => r.stars === 4).length / total) * 100) : 0 },
          3: { count: storedRatings.filter((r) => r.stars === 3).length, percentage: total > 0 ? Math.round((storedRatings.filter((r) => r.stars === 3).length / total) * 100) : 0 },
          2: { count: storedRatings.filter((r) => r.stars === 2).length, percentage: total > 0 ? Math.round((storedRatings.filter((r) => r.stars === 2).length / total) * 100) : 0 },
          1: { count: storedRatings.filter((r) => r.stars === 1).length, percentage: total > 0 ? Math.round((storedRatings.filter((r) => r.stars === 1).length / total) * 100) : 0 },
        },
        recentReviews: storedRatings.slice(-50).reverse(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Unable to record rating at this time.',
    });
  }
});

// App Version & Update Check endpoint for installed PWA & mobile clients
const CURRENT_APP_VERSION = '1.2.0';
const APP_RELEASE_TIMESTAMP = Date.now();
const APP_RELEASE_NOTES = [
  'Real-time PWA app update notifications for installed mobile terminals',
  'Automated blockchain payment discrepancy detection (Underpaid / Overpaid)',
  'Enhanced high-speed parallel mempool & RPC indexing',
  'Performance and offline caching stability improvements',
];

app.get('/api/app-version', (_req, res) => {
  res.json({
    version: CURRENT_APP_VERSION,
    buildTime: APP_RELEASE_TIMESTAMP,
    releaseNotes: APP_RELEASE_NOTES,
    minSupportedVersion: '1.0.0',
    serverTime: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Merchant X Server', version: CURRENT_APP_VERSION, timestamp: new Date().toISOString() });
});

// Vite Middleware for development & Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Merchant X Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

