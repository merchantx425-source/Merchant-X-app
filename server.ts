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
 * AI Crypto Merchant Assistant Endpoint
 * Connects to Gemini API server-side using @google/genai SDK
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
    if (!apiKey) {
      // Return helpful offline response if key is not configured in sandbox
      return res.status(200).json({
        success: true,
        answer: `I am your Merchant X Crypto Assistant. I see your active terminal records. To enable real-time Gemini AI queries, please ensure GEMINI_API_KEY is configured. In the meantime, you have recorded ${context?.transactions?.length || 0} transactions in your active ledger.`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the Merchant X Crypto Merchant AI Assistant, built directly into the Merchant X non-custodial Point-of-Sale terminal.
Your job is to assist merchants with their payments, settlement balances, transaction records, crypto conversions, and payment discrepancy inquiries using accurate, natural, professional language.

CRITICAL RULES:
1. DO NOT invent or hallucinate fake transactions, fake balances, fake prices, or fake blockchain information.
2. Rely strictly on the real live merchant context provided below (transactions ledger, balances, current live exchange rates, fiat currency, and merchant configuration).
3. If the merchant asks for fiat conversions (e.g., "How much is 50 USDT in naira?"), use the exact exchange rates in the provided context or formula: amount * rate.
4. For questions regarding "today", "this week", or "this month", filter the transaction timestamps accurately relative to the current timestamp (${new Date().toISOString()}).
5. Clearly distinguish between 'paid', 'underpaid', 'overpaid', 'pending', and 'failed' transactions when asked.
6. Provide concise, well-formatted answers with bold highlights, clean bullet points, or crypto amounts when helpful.

MERCHANT LIVE CONTEXT:
- Current Server Time (UTC): ${new Date().toISOString()}
- Merchant Display Name: ${context?.merchantName || 'Merchant Terminal'}
- Default Fiat Currency: ${context?.fiatCurrency || 'NGN'} (${context?.fiatSymbol || '₦'})
- Live Rates (1 Crypto in ${context?.fiatCurrency || 'NGN'}): ${JSON.stringify(context?.liveRates || {})}
- Live Rates in USD: ${JSON.stringify(context?.liveRatesUsd || {})}
- Real On-Chain Balances: ${JSON.stringify(context?.balances || {})}
- Connected Settlement Addresses: EVM: ${context?.evmAddress || 'Not set'}, BTC: ${context?.btcAddress || 'Not set'}
- Real Transactions Ledger (${context?.transactions?.length || 0} records):
${JSON.stringify(context?.transactions || [], null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt.trim(),
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const answer = response.text || 'I could not generate an answer at this time. Please try again.';

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (err: any) {
    console.error('[AI Assistant Error]:', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process AI assistant request.',
      details: err.message || 'Unknown error',
    });
  }
});

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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Merchant X Server', timestamp: new Date().toISOString() });
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

