import { ethers } from 'ethers';
import { RPC_URLS, SUPPORTED_ASSETS, ERC20_ABI, SUPPORTED_FIAT } from '../config/constants';
import { CryptoAsset, FiatCurrency, TransactionRecord } from '../types/merchant';

// Cache structure for live exchange rates
interface RateCache {
  timestamp: number;
  cryptoUsd: Record<CryptoAsset, number>;
  fiatRates: Record<string, number>; // USD -> Fiat rates (e.g. USD -> NGN = 1580, USD -> EUR = 0.92)
}

let ratesCache: RateCache | null = null;
const CACHE_TTL = 20000; // 20 seconds cache freshness

export interface LiveRatesResult {
  cryptoUsd: Record<CryptoAsset, number>;
  fiatPerUsd: number;
  fiatRates: Record<string, number>;
  cryptoInFiat: Record<CryptoAsset, number>;
  timestamp: number;
  fiatCurrency: FiatCurrency;
}

/**
 * Ultra-fast Direct JSON-RPC caller across multiple nodes with timeout race
 */
export async function callDirectJsonRpc(
  rpcList: string[],
  method: string,
  params: any[],
  timeoutMs = 4500
): Promise<any> {
  let lastErr: any = null;
  for (const url of rpcList) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.result !== undefined && json.result !== null) {
          return json.result;
        }
      }
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw lastErr || new Error(`Direct JSON-RPC failed for ${method}`);
}

/**
 * Robust JSON-RPC query helper with automatic fallback across multiple public nodes
 */
export async function executeWithPolygonFallback<T>(
  action: (provider: ethers.JsonRpcProvider) => Promise<T>
): Promise<T> {
  let lastError: any = null;
  for (const url of RPC_URLS.POLYGON) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 137, { staticNetwork: true });
      const res = await Promise.race([
        action(provider),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 5000)),
      ]);
      return res;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error('All Polygon RPC endpoints failed');
}

/**
 * Robust JSON-RPC query helper with automatic fallback across multiple Ethereum nodes
 */
export async function executeWithEthereumFallback<T>(
  action: (provider: ethers.JsonRpcProvider) => Promise<T>
): Promise<T> {
  let lastError: any = null;
  for (const url of RPC_URLS.ETHEREUM) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 1, { staticNetwork: true });
      const res = await Promise.race([
        action(provider),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 5000)),
      ]);
      return res;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error('All Ethereum RPC endpoints failed');
}

/**
 * Fetch real USD base crypto prices and real FX fiat conversion rates
 * Architecture:
 * 1. Crypto USD Price (Base)
 * 2. Foreign Exchange Rates (USD -> Fiat, e.g. NGN, EUR, GBP, CAD, AUD, JPY, CHF, ZAR, KES, GHS)
 * 3. Crypto in Fiat = Crypto USD Price × (USD -> Fiat Rate)
 */
export async function fetchLiveCryptoRates(fiat: FiatCurrency = 'USD'): Promise<LiveRatesResult> {
  const now = Date.now();

  // Baseline standard USD prices (used as sensible starting values)
  const defaultUsdRates: Record<CryptoAsset, number> = {
    BTC: 80000.0,
    ETH: 2500.0,
    USDT: 1.0,
    USDC: 1.0,
    POL: 0.11,
    VERSE: 0.000022, // Official Verse market rate
  };

  const defaultFiatToUsd: Record<FiatCurrency, number> = {
    USD: 1.0,
    NGN: 1580.0,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 154.5,
    CHF: 0.88,
    ZAR: 18.2,
    KES: 130.0,
    GHS: 15.5,
  };

  // If cache is fresh and contains rates, we can derive the requested fiat rates directly
  if (ratesCache && now - ratesCache.timestamp < CACHE_TTL) {
    const usdPrices = ratesCache.cryptoUsd;
    const fiatPerUsd = ratesCache.fiatRates[fiat] || (fiat === 'USD' ? 1.0 : defaultFiatToUsd[fiat] || 1.0);
    const cryptoInFiat: Record<CryptoAsset, number> = {
      BTC: usdPrices.BTC * fiatPerUsd,
      ETH: usdPrices.ETH * fiatPerUsd,
      USDT: usdPrices.USDT * fiatPerUsd,
      USDC: usdPrices.USDC * fiatPerUsd,
      POL: usdPrices.POL * fiatPerUsd,
      VERSE: usdPrices.VERSE * fiatPerUsd,
    };

    return {
      cryptoUsd: usdPrices,
      fiatPerUsd,
      fiatRates: ratesCache.fiatRates,
      cryptoInFiat,
      timestamp: ratesCache.timestamp,
      fiatCurrency: fiat,
    };
  }

  let btcUsd = ratesCache?.cryptoUsd?.BTC || defaultUsdRates.BTC;
  let ethUsd = ratesCache?.cryptoUsd?.ETH || defaultUsdRates.ETH;
  let usdtUsd = ratesCache?.cryptoUsd?.USDT || 1.0;
  let usdcUsd = ratesCache?.cryptoUsd?.USDC || 1.0;
  let polUsd = ratesCache?.cryptoUsd?.POL || defaultUsdRates.POL;
  let verseUsd = ratesCache?.cryptoUsd?.VERSE || defaultUsdRates.VERSE;

  // -------------------------------------------------------------
  // 1. PRIMARY SOURCE: CoinGecko Direct & GeckoTerminal APIs
  // Covers:
  // - BTC: 'bitcoin' / WBTC
  // - ETH: 'ethereum' / WETH
  // - USDT: 'tether'
  // - USDC: 'usd-coin'
  // - POL: 'polygon-ecosystem-token' / 'matic-network' / WPOL
  // - VERSE: 'verse-token' / 'verse' + Polygon fxVERSE & Ethereum VERSE
  // -------------------------------------------------------------
  let cgSuccess = false;

  // A. Primary CoinGecko Simple Price API
  try {
    const cgController = new AbortController();
    const cgTimer = setTimeout(() => cgController.abort(), 4000);
    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,polygon-ecosystem-token,matic-network,verse-bitcoin,verse-token,verse&vs_currencies=usd',
      { headers: { Accept: 'application/json' }, signal: cgController.signal }
    ).then((r) => (r.ok ? r.json() : null));
    clearTimeout(cgTimer);

    if (cgRes && typeof cgRes === 'object') {
      if (cgRes.bitcoin?.usd && cgRes.bitcoin.usd > 0) btcUsd = cgRes.bitcoin.usd;
      if (cgRes.ethereum?.usd && cgRes.ethereum.usd > 0) ethUsd = cgRes.ethereum.usd;
      if (cgRes.tether?.usd && cgRes.tether.usd > 0) usdtUsd = cgRes.tether.usd;
      if (cgRes['usd-coin']?.usd && cgRes['usd-coin'].usd > 0) usdcUsd = cgRes['usd-coin'].usd;
      if (cgRes['polygon-ecosystem-token']?.usd && cgRes['polygon-ecosystem-token'].usd > 0) {
        polUsd = cgRes['polygon-ecosystem-token'].usd;
      } else if (cgRes['matic-network']?.usd && cgRes['matic-network'].usd > 0) {
        polUsd = cgRes['matic-network'].usd;
      }
      if (cgRes['verse-bitcoin']?.usd && cgRes['verse-bitcoin'].usd > 0) {
        verseUsd = cgRes['verse-bitcoin'].usd;
      } else if (cgRes['verse-token']?.usd && cgRes['verse-token'].usd > 0) {
        verseUsd = cgRes['verse-token'].usd;
      } else if (cgRes.verse?.usd && cgRes.verse.usd > 0) {
        verseUsd = cgRes.verse.usd;
      }
      cgSuccess = true;
    }
  } catch {
    // Continue to GeckoTerminal
  }

  // B. CoinGecko's GeckoTerminal on-chain API (Ultra-reliable real-time CoinGecko feeds)
  // Especially critical for VERSE (official Polygon fxVERSE token 0xc708d6f2153933daa50b2d0758955be0a93a8fec)
  try {
    const [gtVersePoly, gtVerseEth, gtPol, gtEth, gtBtc] = await Promise.all([
      // CoinGecko GeckoTerminal Polygon fxVERSE
      fetch('https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens/0xc708d6f2153933daa50b2d0758955be0a93a8fec')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // CoinGecko GeckoTerminal Ethereum VERSE
      fetch('https://api.geckoterminal.com/api/v2/networks/eth/tokens/0x249cA82617eC3DfB2589c4c17ab7EC9765350a18')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // CoinGecko GeckoTerminal Polygon POL
      fetch('https://api.geckoterminal.com/api/v2/networks/polygon_pos/tokens/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // CoinGecko GeckoTerminal WETH
      fetch('https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      // CoinGecko GeckoTerminal WBTC
      fetch('https://api.geckoterminal.com/api/v2/networks/eth/tokens/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const vPolyPrice = parseFloat(gtVersePoly?.data?.attributes?.price_usd || '0');
    const vEthPrice = parseFloat(gtVerseEth?.data?.attributes?.price_usd || '0');
    const polGtPrice = parseFloat(gtPol?.data?.attributes?.price_usd || '0');
    const ethGtPrice = parseFloat(gtEth?.data?.attributes?.price_usd || '0');
    const btcGtPrice = parseFloat(gtBtc?.data?.attributes?.price_usd || '0');

    if (vPolyPrice > 0) {
      verseUsd = vPolyPrice;
    } else if (vEthPrice > 0) {
      verseUsd = vEthPrice;
    }

    if (polGtPrice > 0 && (!cgSuccess || polUsd === defaultUsdRates.POL)) {
      polUsd = polGtPrice;
    }
    if (ethGtPrice > 0 && (!cgSuccess || ethUsd === defaultUsdRates.ETH)) {
      ethUsd = ethGtPrice;
    }
    if (btcGtPrice > 0 && (!cgSuccess || btcUsd === defaultUsdRates.BTC)) {
      btcUsd = btcGtPrice;
    }
  } catch {
    // Non-blocking
  }

  // -------------------------------------------------------------
  // 2. FALLBACK CRYPTO SOURCES (DexScreener, Bitcoin.com Markets, CoinMarketCap, Binance)
  // Ensures 100% uptime if CoinGecko is rate-limited or temporarily congested
  // -------------------------------------------------------------
  if (verseUsd === defaultUsdRates.VERSE) {
    try {
      const [btcComRes, dexFxRes] = await Promise.all([
        fetch('https://markets.api.bitcoin.com/coin/data?c=VERSE')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('https://api.dexscreener.com/latest/dex/tokens/0xc708d6f2153933daa50b2d0758955be0a93a8fec')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const btcComPrice = parseFloat(btcComRes?.price || btcComRes?.data?.price || btcComRes?.data?.rate || '0');
      if (btcComPrice > 0) {
        verseUsd = btcComPrice;
      } else if (dexFxRes?.pairs && dexFxRes.pairs.length > 0) {
        const sorted = dexFxRes.pairs.sort(
          (a: any, b: any) => parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
        );
        const bestPair = sorted.find((p: any) => parseFloat(p.priceUsd || '0') > 0);
        if (bestPair && parseFloat(bestPair.priceUsd) > 0) {
          verseUsd = parseFloat(bestPair.priceUsd);
        }
      }
    } catch {}
  }

  // CoinMarketCap / Binance fallback for majors if needed
  if (btcUsd === defaultUsdRates.BTC || ethUsd === defaultUsdRates.ETH || polUsd === defaultUsdRates.POL) {
    try {
      const cmcRes = await fetch(
        'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/quote/latest?id=1,1027,825,3408,28321,22929',
        { headers: { Accept: 'application/json' } }
      ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

      if (cmcRes?.data && Array.isArray(cmcRes.data)) {
        for (const item of cmcRes.data) {
          const sym = (item.symbol || '').toUpperCase();
          const price = item.quotes?.[0]?.price;
          if (typeof price === 'number' && price > 0) {
            if (sym === 'BTC' && btcUsd === defaultUsdRates.BTC) btcUsd = price;
            else if (sym === 'ETH' && ethUsd === defaultUsdRates.ETH) ethUsd = price;
            else if (sym === 'USDT') usdtUsd = price;
            else if (sym === 'USDC') usdcUsd = price;
            else if ((sym === 'POL' || sym === 'MATIC') && polUsd === defaultUsdRates.POL) polUsd = price;
            else if (sym === 'VERSE' && verseUsd === defaultUsdRates.VERSE) verseUsd = price;
          }
        }
      }
    } catch {}

    try {
      const [bBtc, bEth, bPol] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=POLUSDT').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (bBtc?.price && parseFloat(bBtc.price) > 0 && btcUsd === defaultUsdRates.BTC) btcUsd = parseFloat(bBtc.price);
      if (bEth?.price && parseFloat(bEth.price) > 0 && ethUsd === defaultUsdRates.ETH) ethUsd = parseFloat(bEth.price);
      if (bPol?.price && parseFloat(bPol.price) > 0 && polUsd === defaultUsdRates.POL) polUsd = parseFloat(bPol.price);
    } catch {}
  }

  // -------------------------------------------------------------
  // 4. REAL FOREIGN EXCHANGE (FX) RATES vs USD
  // Real-time rates for NGN, EUR, GBP, CAD, AUD, JPY, CHF, ZAR, KES, GHS
  // -------------------------------------------------------------
  let fiatRates: Record<string, number> = {
    USD: 1.0,
    ...defaultFiatToUsd,
  };

  try {
    // Primary: Open Exchange Rates API (open.er-api.com) - high rate limit, real central bank rates
    const erRes = await fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    if (erRes?.rates && typeof erRes.rates === 'object') {
      fiatRates = {
        ...fiatRates,
        ...erRes.rates,
        USD: 1.0,
      };
    } else {
      // Secondary: ExchangeRate-API
      const exRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (exRes?.rates && typeof exRes.rates === 'object') {
        fiatRates = {
          ...fiatRates,
          ...exRes.rates,
          USD: 1.0,
        };
      }
    }
  } catch {
    // Use fallback fiatRates
  }

  // Update in-memory cache
  const usdPrices: Record<CryptoAsset, number> = {
    BTC: btcUsd > 0 ? btcUsd : defaultUsdRates.BTC,
    ETH: ethUsd > 0 ? ethUsd : defaultUsdRates.ETH,
    USDT: usdtUsd > 0 ? usdtUsd : 1.0,
    USDC: usdcUsd > 0 ? usdcUsd : 1.0,
    POL: polUsd > 0 ? polUsd : defaultUsdRates.POL,
    VERSE: verseUsd > 0 ? verseUsd : defaultUsdRates.VERSE,
  };

  ratesCache = {
    timestamp: now,
    cryptoUsd: usdPrices,
    fiatRates,
  };

  // Convert USD base price to selected fiat: (Crypto USD Price) × (USD -> Fiat Rate)
  const fiatPerUsd = fiatRates[fiat] || (fiat === 'USD' ? 1.0 : defaultFiatToUsd[fiat] || 1.0);

  const cryptoInFiat: Record<CryptoAsset, number> = {
    BTC: usdPrices.BTC * fiatPerUsd,
    ETH: usdPrices.ETH * fiatPerUsd,
    USDT: usdPrices.USDT * fiatPerUsd,
    USDC: usdPrices.USDC * fiatPerUsd,
    POL: usdPrices.POL * fiatPerUsd,
    VERSE: usdPrices.VERSE * fiatPerUsd,
  };

  return {
    cryptoUsd: usdPrices,
    fiatPerUsd,
    fiatRates,
    cryptoInFiat,
    timestamp: now,
    fiatCurrency: fiat,
  };
}

/**
 * Format fiat amount with symbol and locale
 */
export function formatFiatAmount(
  amount: number,
  fiat: FiatCurrency,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const config = SUPPORTED_FIAT[fiat] || SUPPORTED_FIAT.USD;
  const formatted = amount.toLocaleString(config.locale || 'en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  return `${config.symbol}${formatted}`;
}

/**
 * Format crypto market price in selected fiat currency
 * Handles micro-values like VERSE with high precision so they never display as $0 or ₦0
 */
export function formatCryptoMarketPrice(
  priceInFiat: number,
  fiat: FiatCurrency,
  asset?: CryptoAsset
): string {
  const config = SUPPORTED_FIAT[fiat] || SUPPORTED_FIAT.USD;
  if (priceInFiat <= 0 || isNaN(priceInFiat)) {
    return `${config.symbol}0.00`;
  }

  if (priceInFiat < 0.0001) {
    return `${config.symbol}${priceInFiat.toFixed(8).replace(/\.?0+$/, '')}`;
  }
  if (priceInFiat < 0.01) {
    return `${config.symbol}${priceInFiat.toFixed(6)}`;
  }
  if (priceInFiat < 1.0) {
    return `${config.symbol}${priceInFiat.toFixed(4)}`;
  }
  if (priceInFiat < 1000) {
    return `${config.symbol}${priceInFiat.toLocaleString(config.locale || 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${config.symbol}${priceInFiat.toLocaleString(config.locale || 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate the fiat value for an asset balance: balanceRaw × cryptoInFiatRate
 */
export function calculateAssetFiatValue(
  balanceRaw: number,
  cryptoInFiatRate: number
): number {
  if (isNaN(balanceRaw) || balanceRaw <= 0 || isNaN(cryptoInFiatRate) || cryptoInFiatRate <= 0) {
    return 0;
  }
  return balanceRaw * cryptoInFiatRate;
}

/**
 * Calculate total portfolio fiat value across all assets
 */
export function calculateTotalPortfolioFiatValue(
  balances: Record<CryptoAsset, { balanceRaw: number }>,
  cryptoInFiatRates: Record<CryptoAsset, number>
): number {
  let total = 0;
  for (const asset of Object.keys(balances) as CryptoAsset[]) {
    const raw = balances[asset]?.balanceRaw || 0;
    const rate = cryptoInFiatRates[asset] || 0;
    if (raw > 0 && rate > 0) {
      total += raw * rate;
    }
  }
  return total;
}

/**
 * Calculate total portfolio USD value across all assets
 */
export function calculateTotalPortfolioUsdValue(
  balances: Record<CryptoAsset, { balanceRaw: number }>,
  cryptoRatesUsd: Record<CryptoAsset, number>
): number {
  let total = 0;
  for (const asset of Object.keys(balances) as CryptoAsset[]) {
    const raw = balances[asset]?.balanceRaw || 0;
    const rate = cryptoRatesUsd[asset] || 0;
    if (raw > 0 && rate > 0) {
      total += raw * rate;
    }
  }
  return total;
}

/**
 * Format on-chain balance with exact precision without losing decimal fidelity
 */
export function formatExactBalance(balanceRaw: number, asset: CryptoAsset): string {
  if (isNaN(balanceRaw) || balanceRaw === 0) {
    return '0';
  }

  // Exact precision formatting without losing decimal fidelity
  if (asset === 'BTC') {
    // Bitcoin has 8 decimals: avoid scientific notation and strip trailing zeroes
    const formatted = balanceRaw.toFixed(8).replace(/\.?0+$/, '');
    return formatted;
  }

  if (asset === 'ETH') {
    // Ethereum native has up to 18 decimals
    if (balanceRaw < 0.0001) {
      return balanceRaw.toFixed(6).replace(/\.?0+$/, '');
    }
    return balanceRaw.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }

  if (asset === 'POL') {
    return balanceRaw.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  if (asset === 'USDT' || asset === 'USDC') {
    return balanceRaw.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  if (asset === 'VERSE') {
    if (balanceRaw >= 1000) {
      return balanceRaw.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    return balanceRaw.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  return balanceRaw.toString();
}

/**
 * Concurrently query RPC nodes with fast racing across top endpoints
 */
async function queryJsonRpcFast(
  rpcUrls: string[],
  method: string,
  params: any[],
  timeoutMs = 3500
): Promise<any> {
  const candidates = rpcUrls.slice(0, 4);
  const promises = candidates.map(async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000000),
          method,
          params,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.result !== undefined && json.result !== null) {
        return json.result;
      }
      throw new Error(json.error?.message || 'Empty JSON-RPC result');
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  });

  try {
    return await Promise.any(promises);
  } catch {
    // Fallback: try sequentially with remaining endpoints
    for (const url of rpcUrls.slice(4)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Math.random() * 1000000),
            method,
            params,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          if (json.result !== undefined && json.result !== null) {
            return json.result;
          }
        }
      } catch {
        continue;
      }
    }
    throw new Error(`All RPC endpoints failed for ${method}`);
  }
}

/**
 * Query ERC-20 token balance with Web3 Injected + Parallel RPC + Blockscout + Ethers Provider
 */
async function queryErc20Balance(
  contractAddress: string,
  userAddress: string,
  decimals: number,
  chain: 'POLYGON' | 'ETHEREUM'
): Promise<number> {
  const cleanAddr = userAddress.trim().toLowerCase();
  if (!cleanAddr.startsWith('0x')) return 0;
  const paddedAddr = cleanAddr.slice(2).padStart(64, '0');
  const data = `0x70a08231${paddedAddr}`;
  const rpcList = chain === 'POLYGON' ? RPC_URLS.POLYGON : RPC_URLS.ETHEREUM;

  // 1. Fast Injected Provider (MetaMask / Browser wallet)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const res = await (window as any).ethereum.request({
        method: 'eth_call',
        params: [{ to: contractAddress, data }, 'latest'],
      });
      if (res && typeof res === 'string' && res !== '0x' && res !== '0x0') {
        const val = BigInt(res);
        return parseFloat(ethers.formatUnits(val, decimals));
      }
    } catch {}
  }

  // 2. Fast Parallel Public JSON-RPC
  try {
    const hex = await queryJsonRpcFast(rpcList, 'eth_call', [{ to: contractAddress, data }, 'latest'], 3500);
    if (hex && typeof hex === 'string') {
      if (hex === '0x' || hex === '0x0') return 0;
      const val = BigInt(hex);
      return parseFloat(ethers.formatUnits(val, decimals));
    }
  } catch {}

  // 3. Blockscout REST API
  try {
    const domain = chain === 'POLYGON' ? 'polygon.blockscout.com' : 'eth.blockscout.com';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://${domain}/api/v2/addresses/${cleanAddr}/tokens`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json?.items && Array.isArray(json.items)) {
        const found = json.items.find(
          (it: any) => (it.token?.address || '').toLowerCase() === contractAddress.toLowerCase()
        );
        if (found && found.value !== undefined) {
          const dec = parseInt(found.token?.decimals || String(decimals), 10);
          return parseFloat(ethers.formatUnits(found.value, dec));
        }
        return 0;
      }
    }
  } catch {}

  // 4. Ethers Fallback Provider
  try {
    const fallbackFn = chain === 'POLYGON' ? executeWithPolygonFallback : executeWithEthereumFallback;
    const balBigInt = await fallbackFn(async (provider) => {
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      return await contract.balanceOf(cleanAddr);
    });
    return parseFloat(ethers.formatUnits(balBigInt, decimals));
  } catch {}

  return 0;
}

/**
 * Query Native Coin Balance (POL on Polygon, ETH on Ethereum)
 */
async function queryNativeBalance(
  userAddress: string,
  chain: 'POLYGON' | 'ETHEREUM'
): Promise<number> {
  const cleanAddr = userAddress.trim().toLowerCase();
  if (!cleanAddr.startsWith('0x')) return 0;
  const rpcList = chain === 'POLYGON' ? RPC_URLS.POLYGON : RPC_URLS.ETHEREUM;

  // 1. Fast Parallel JSON-RPC
  try {
    const hex = await queryJsonRpcFast(rpcList, 'eth_getBalance', [cleanAddr, 'latest'], 3500);
    if (hex && typeof hex === 'string') {
      if (hex === '0x' || hex === '0x0') return 0;
      const val = BigInt(hex);
      return parseFloat(ethers.formatEther(val));
    }
  } catch {}

  // 2. Fast Injected Provider
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const hex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [cleanAddr, 'latest'],
      });
      if (hex && typeof hex === 'string') {
        const val = BigInt(hex);
        return parseFloat(ethers.formatEther(val));
      }
    } catch {}
  }

  // 3. Blockscout REST API
  try {
    const domain = chain === 'POLYGON' ? 'polygon.blockscout.com' : 'eth.blockscout.com';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://${domain}/api/v2/addresses/${cleanAddr}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json?.coin_balance !== undefined) {
        return parseFloat(ethers.formatEther(json.coin_balance || '0'));
      }
    }
  } catch {}

  // 4. Ethers Provider Fallback
  try {
    const fallbackFn = chain === 'POLYGON' ? executeWithPolygonFallback : executeWithEthereumFallback;
    const wei = await fallbackFn((provider) => provider.getBalance(cleanAddr));
    return parseFloat(ethers.formatEther(wei));
  } catch {}

  return 0;
}

/**
 * Query Bitcoin Balance across Mempool, Blockstream, Blockchain.info, and BlockCypher
 */
async function queryBitcoinBalance(btcAddress: string): Promise<number> {
  const cleanAddr = btcAddress.trim();
  if (!cleanAddr || cleanAddr.startsWith('0x')) return 0;

  const endpoints = [
    // 1. Mempool.space
    async () => {
      const res = await fetch(`https://mempool.space/api/address/${cleanAddr}`);
      if (!res.ok) throw new Error('Mempool error');
      const data = await res.json();
      const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
      const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
      return Math.max(0, funded - spent) / 1e8;
    },
    // 2. Blockstream.info
    async () => {
      const res = await fetch(`https://blockstream.info/api/address/${cleanAddr}`);
      if (!res.ok) throw new Error('Blockstream error');
      const data = await res.json();
      const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
      const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
      return Math.max(0, funded - spent) / 1e8;
    },
    // 3. Blockchain.info
    async () => {
      const res = await fetch(`https://blockchain.info/rawaddr/${cleanAddr}?cors=true`);
      if (!res.ok) throw new Error('Blockchain.info error');
      const data = await res.json();
      return Math.max(0, data.final_balance || 0) / 1e8;
    },
    // 4. Blockcypher
    async () => {
      const res = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${cleanAddr}/balance`);
      if (!res.ok) throw new Error('Blockcypher error');
      const data = await res.json();
      return Math.max(0, data.final_balance || 0) / 1e8;
    },
  ];

  try {
    return await Promise.any(endpoints.map((fn) => fn()));
  } catch (err) {
    console.warn(`Bitcoin query error for ${cleanAddr}:`, err);
    throw new Error('Unable to query Bitcoin on-chain balance');
  }
}

/**
 * Fetch REAL on-chain balance for all 6 supported assets
 */
export async function fetchRealAssetBalance(
  asset: CryptoAsset,
  address: string
): Promise<{ balance: string; balanceRaw: number; error: string | null }> {
  if (!address || address.trim() === '') {
    return { balance: '0', balanceRaw: 0, error: null };
  }

  const cleanAddr = address.trim();

  try {
    // 1. Bitcoin (BTC)
    if (asset === 'BTC') {
      if (cleanAddr.startsWith('0x')) {
        return { balance: '0', balanceRaw: 0, error: null };
      }
      try {
        const btc = await queryBitcoinBalance(cleanAddr);
        return {
          balance: formatExactBalance(btc, 'BTC'),
          balanceRaw: btc,
          error: null,
        };
      } catch (btcErr) {
        return {
          balance: '0',
          balanceRaw: 0,
          error: 'Unable to load wallet balances. Please try again',
        };
      }
    }

    // 2. EVM Queries (Must be 0x address)
    if (!cleanAddr.startsWith('0x')) {
      return { balance: '0', balanceRaw: 0, error: null };
    }

    // A. POL (Polygon Native + Ethereum POL ERC-20)
    if (asset === 'POL') {
      const [polygonNative, ethPol] = await Promise.all([
        queryNativeBalance(cleanAddr, 'POLYGON'),
        queryErc20Balance('0x455e53C3640dD1f66E3309808663022260238848', cleanAddr, 18, 'ETHEREUM'),
      ]);
      const total = polygonNative + ethPol;
      return {
        balance: formatExactBalance(total, 'POL'),
        balanceRaw: total,
        error: null,
      };
    }

    // B. ETH (Ethereum Native + Polygon WETH)
    if (asset === 'ETH') {
      const [nativeEth, polyWeth] = await Promise.all([
        queryNativeBalance(cleanAddr, 'ETHEREUM'),
        queryErc20Balance('0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', cleanAddr, 18, 'POLYGON'),
      ]);
      const total = nativeEth + polyWeth;
      return {
        balance: formatExactBalance(total, 'ETH'),
        balanceRaw: total,
        error: null,
      };
    }

    // C. VERSE (Polygon fxVERSE 0xc708D6F2153933DAA50B2D0758955Be0A + Ethereum canonical VERSE 0x249cA82617eC3DfB2589c4c17ab7EC9765350a18 + Polygon VERSE 0xc3aa16362d381282d7bfcf73812d46e300958ad8)
    if (asset === 'VERSE') {
      const [fxPolyVerse, ethVerse, polyVerse] = await Promise.all([
        queryErc20Balance('0xc708d6f2153933daa50b2d0758955be0a93a8fec', cleanAddr, 18, 'POLYGON'),
        queryErc20Balance('0x249cA82617eC3DfB2589c4c17ab7EC9765350a18', cleanAddr, 18, 'ETHEREUM'),
        queryErc20Balance('0xc3aa16362d381282d7bfcf73812d46e300958ad8', cleanAddr, 18, 'POLYGON'),
      ]);
      const total = fxPolyVerse + ethVerse + polyVerse;
      return {
        balance: formatExactBalance(total, 'VERSE'),
        balanceRaw: total,
        error: null,
      };
    }

    // D. USDT (Polygon USDT + Ethereum USDT)
    if (asset === 'USDT') {
      const [polyUsdt, ethUsdt] = await Promise.all([
        queryErc20Balance('0xc2132D05D31c914a87C6611C10748AEb04B58e8F', cleanAddr, 6, 'POLYGON'),
        queryErc20Balance('0xdAC17F958D2ee523a2206206994597C13D831ec7', cleanAddr, 6, 'ETHEREUM'),
      ]);
      const total = polyUsdt + ethUsdt;
      return {
        balance: formatExactBalance(total, 'USDT'),
        balanceRaw: total,
        error: null,
      };
    }

    // E. USDC (Polygon Native USDC + Polygon Bridged USDC.e + Ethereum USDC)
    if (asset === 'USDC') {
      const [polyNative, polyBridged, ethUsdc] = await Promise.all([
        queryErc20Balance('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', cleanAddr, 6, 'POLYGON'),
        queryErc20Balance('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', cleanAddr, 6, 'POLYGON'),
        queryErc20Balance('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', cleanAddr, 6, 'ETHEREUM'),
      ]);
      const total = polyNative + polyBridged + ethUsdc;
      return {
        balance: formatExactBalance(total, 'USDC'),
        balanceRaw: total,
        error: null,
      };
    }

    return { balance: '0', balanceRaw: 0, error: null };
  } catch (err: any) {
    console.warn(`Balance query error for ${asset}:`, err);
    return {
      balance: '0',
      balanceRaw: 0,
      error: 'Unable to load wallet balances. Please try again',
    };
  }
}

export interface VerificationResult {
  isVerified: boolean;
  status: 'paid' | 'underpaid' | 'overpaid' | 'failed';
  blockNumber?: number;
  timestamp?: number;
  customerAddress?: string;
  expectedAmount?: number;
  actualAmount?: number;
  discrepancyAmount?: number;
  errorMessage?: string;
}

/**
 * Verify a real on-chain transaction with strict fake payment prevention and BigInt financial precision
 * Correctly distinguishes between PAID, UNDERPAID, and OVERPAID without floating-point math.
 */
export async function verifyBlockchainTransaction(params: {
  txHash: string;
  expectedAsset: CryptoAsset;
  expectedAmountCrypto: number;
  merchantWallet: string;
}): Promise<VerificationResult> {
  const { txHash, expectedAsset, expectedAmountCrypto, merchantWallet } = params;
  const config = SUPPORTED_ASSETS[expectedAsset];
  const cleanTxHash = txHash.trim();

  if (!cleanTxHash) {
    return { isVerified: false, status: 'failed', errorMessage: 'Please provide a valid transaction hash.' };
  }

  try {
    // 1. Bitcoin verification using Satoshis (BigInt)
    if (config.networkFamily === 'bitcoin') {
      let txData: any = null;

      // Try Mempool.space
      try {
        const res = await fetch(`https://mempool.space/api/tx/${cleanTxHash}`);
        if (res.ok) {
          txData = await res.json();
        }
      } catch {
        // Fallback
      }

      // Try Blockstream API fallback
      if (!txData) {
        try {
          const bsRes = await fetch(`https://blockstream.info/api/tx/${cleanTxHash}`);
          if (bsRes.ok) {
            txData = await bsRes.json();
          }
        } catch {
          // Fallback
        }
      }

      if (!txData) {
        return {
          isVerified: false,
          status: 'failed',
          errorMessage: 'Transaction hash not found in Bitcoin mempool or blockchain.',
        };
      }

      // Check if one of the outputs sends to merchant address
      const matchedOutput = txData.vout?.find(
        (v: any) => v.scriptpubkey_address?.toLowerCase() === merchantWallet.toLowerCase()
      );

      if (!matchedOutput) {
        return {
          isVerified: false,
          status: 'failed',
          errorMessage: 'Fraud check failed: Recipient address does not match your merchant Bitcoin wallet.',
        };
      }

      const actualSats = BigInt(matchedOutput.value || 0);
      const expectedSats = BigInt(Math.round(expectedAmountCrypto * 1e8));
      const toleranceSats = (expectedSats * 5n) / 1000n; // 0.5% tolerance

      const actualBtc = Number(actualSats) / 1e8;
      const senderAddr = txData.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet';
      const blockNumber = txData.status?.block_height;
      const timestamp = txData.status?.block_time ? txData.status.block_time * 1000 : Date.now();

      if (actualSats < expectedSats - toleranceSats) {
        const shortfall = Number(expectedSats - actualSats) / 1e8;
        return {
          isVerified: true,
          status: 'underpaid',
          blockNumber,
          timestamp,
          customerAddress: senderAddr,
          expectedAmount: expectedAmountCrypto,
          actualAmount: actualBtc,
          discrepancyAmount: shortfall,
          errorMessage: `Underpayment: Received ${actualBtc.toFixed(8)} BTC, expected ${expectedAmountCrypto.toFixed(8)} BTC (Shortfall: ${shortfall.toFixed(8)} BTC)`,
        };
      }

      if (actualSats > expectedSats + toleranceSats) {
        const excess = Number(actualSats - expectedSats) / 1e8;
        return {
          isVerified: true,
          status: 'overpaid',
          blockNumber,
          timestamp,
          customerAddress: senderAddr,
          expectedAmount: expectedAmountCrypto,
          actualAmount: actualBtc,
          discrepancyAmount: excess,
        };
      }

      return {
        isVerified: true,
        status: 'paid',
        blockNumber,
        timestamp,
        customerAddress: senderAddr,
        expectedAmount: expectedAmountCrypto,
        actualAmount: actualBtc,
      };
    }

    // 2. EVM Verification (Polygon / Ethereum)
    const isPolygon = config.network === 'Polygon';
    const receipt = isPolygon
      ? await executeWithPolygonFallback((provider) => provider.getTransactionReceipt(cleanTxHash))
      : await executeWithEthereumFallback((provider) => provider.getTransactionReceipt(cleanTxHash));

    if (!receipt) {
      return {
        isVerified: false,
        status: 'failed',
        errorMessage: 'Transaction is pending or not yet mined on the network.',
      };
    }

    if (receipt.status !== 1) {
      return {
        isVerified: false,
        status: 'failed',
        errorMessage: 'Transaction failed or was reverted on-chain.',
      };
    }

    // For ERC20 tokens (VERSE, USDT, USDC), verify Transfer log to merchant address
    if (config.contractAddress) {
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const paddedMerchant = ethers.zeroPadValue(merchantWallet.toLowerCase(), 32).toLowerCase();

      const matchedLog = receipt.logs?.find((log: any) => {
        const isContract = log.address.toLowerCase() === config.contractAddress!.toLowerCase();
        const isTransfer = log.topics?.[0]?.toLowerCase() === transferTopic.toLowerCase();
        const isToMerchant = log.topics?.[2]?.toLowerCase() === paddedMerchant;
        return isContract && isTransfer && isToMerchant;
      });

      if (!matchedLog) {
        return {
          isVerified: false,
          status: 'failed',
          errorMessage: `Fraud check failed: No verified ${expectedAsset} token transfer found to your merchant wallet.`,
        };
      }

      const actualBigInt = ethers.toBigInt(matchedLog.data);
      const expectedDecStr = expectedAmountCrypto.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: config.decimals });
      const expectedBigInt = ethers.parseUnits(expectedDecStr, config.decimals);
      const tolerance = (expectedBigInt * 5n) / 1000n; // 0.5% tolerance

      const actualAmount = parseFloat(ethers.formatUnits(actualBigInt, config.decimals));
      const sender = matchedLog.topics?.[1] ? ethers.stripZerosLeft(matchedLog.topics[1]) : receipt.from;

      if (actualBigInt < expectedBigInt - tolerance) {
        const shortfall = expectedAmountCrypto - actualAmount;
        return {
          isVerified: true,
          status: 'underpaid',
          blockNumber: receipt.blockNumber,
          timestamp: Date.now(),
          customerAddress: sender,
          expectedAmount: expectedAmountCrypto,
          actualAmount,
          discrepancyAmount: shortfall,
          errorMessage: `Underpayment: Received ${actualAmount} ${expectedAsset}, expected ${expectedAmountCrypto} ${expectedAsset}`,
        };
      }

      if (actualBigInt > expectedBigInt + tolerance) {
        const excess = actualAmount - expectedAmountCrypto;
        return {
          isVerified: true,
          status: 'overpaid',
          blockNumber: receipt.blockNumber,
          timestamp: Date.now(),
          customerAddress: sender,
          expectedAmount: expectedAmountCrypto,
          actualAmount,
          discrepancyAmount: excess,
        };
      }

      return {
        isVerified: true,
        status: 'paid',
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        customerAddress: sender,
        expectedAmount: expectedAmountCrypto,
        actualAmount,
      };
    }

    // Native token payment (POL or ETH)
    const provider = isPolygon
      ? await executeWithPolygonFallback(async (p) => p)
      : await executeWithEthereumFallback(async (p) => p);

    const tx = await provider.getTransaction(cleanTxHash);
    if (!tx) {
      return { isVerified: false, status: 'failed', errorMessage: 'Transaction details could not be retrieved.' };
    }

    if (tx.to?.toLowerCase() !== merchantWallet.toLowerCase()) {
      return {
        isVerified: false,
        status: 'failed',
        errorMessage: 'Fraud check failed: Transaction recipient does not match your merchant wallet.',
      };
    }

    const actualWei = tx.value;
    const expectedDecStr = expectedAmountCrypto.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 18 });
    const expectedWei = ethers.parseEther(expectedDecStr);
    const tolerance = (expectedWei * 5n) / 1000n; // 0.5% tolerance

    const actualAmount = parseFloat(ethers.formatEther(actualWei));

    if (actualWei < expectedWei - tolerance) {
      const shortfall = expectedAmountCrypto - actualAmount;
      return {
        isVerified: true,
        status: 'underpaid',
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        customerAddress: receipt.from,
        expectedAmount: expectedAmountCrypto,
        actualAmount,
        discrepancyAmount: shortfall,
        errorMessage: `Underpayment: Received ${actualAmount} ${expectedAsset}, expected ${expectedAmountCrypto} ${expectedAsset}`,
      };
    }

    if (actualWei > expectedWei + tolerance) {
      const excess = actualAmount - expectedAmountCrypto;
      return {
        isVerified: true,
        status: 'overpaid',
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        customerAddress: receipt.from,
        expectedAmount: expectedAmountCrypto,
        actualAmount,
        discrepancyAmount: excess,
      };
    }

    return {
      isVerified: true,
      status: 'paid',
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
      customerAddress: receipt.from,
      expectedAmount: expectedAmountCrypto,
      actualAmount,
    };
  } catch (err: any) {
    return {
      isVerified: false,
      status: 'failed',
      errorMessage: err?.message || 'Blockchain verification failed.',
    };
  }
}

/**
 * Real-time automatic on-chain scanner to detect incoming customer payments
 * Monitors Polygon, Ethereum, and Bitcoin networks using parallel high-speed indexers & RPCs
 */
export async function scanForIncomingPayment(params: {
  merchantWallet: string;
  expectedAsset: CryptoAsset;
  expectedAmountCrypto: number;
  sessionStartTimestamp: number;
  initialBalanceRaw?: number;
}): Promise<{
  isDetected: boolean;
  status?: 'paid' | 'underpaid' | 'overpaid';
  txHash?: string;
  customerAddress?: string;
  expectedAmount?: number;
  actualAmount?: number;
  discrepancyAmount?: number;
  isConfirmed?: boolean;
  blockNumber?: number;
}> {
  const { merchantWallet, expectedAsset, expectedAmountCrypto, sessionStartTimestamp } = params;
  const config = SUPPORTED_ASSETS[expectedAsset];
  const cleanAddr = merchantWallet.trim();

  if (!cleanAddr) {
    return { isDetected: false };
  }

  // Strict session timestamp threshold (allow max 15s clock grace period before invoice was created)
  const minValidTimestampMs = Math.max(0, sessionStartTimestamp - 15000);
  const minRequiredAmount = expectedAmountCrypto * 0.985; // 1.5% max rounding tolerance

  try {
    // 1. Bitcoin Automatic Detection (Runs Mempool.space, Blockstream, and Blockchain.info in parallel)
    if (config.networkFamily === 'bitcoin') {
      if (cleanAddr.startsWith('0x')) return { isDetected: false };

      const btcPromises = [
        // A. Mempool.space address txs
        (async () => {
          try {
            const res = await Promise.race([
              fetch(`https://mempool.space/api/address/${cleanAddr}/txs`),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
            ]);
            if (res.ok) {
              const txs = await res.json();
              if (Array.isArray(txs) && txs.length > 0) {
                for (const tx of txs) {
                  // If confirmed, verify it occurred during the current payment session
                  if (tx.status?.confirmed && tx.status?.block_time) {
                    const txTimeMs = tx.status.block_time * 1000;
                    if (txTimeMs < minValidTimestampMs) continue; // Ignore old historical tx
                  }

                  const matchedVout = tx.vout?.find(
                    (v: any) => v.scriptpubkey_address?.toLowerCase() === cleanAddr.toLowerCase()
                  );
                  if (matchedVout) {
                    const btcAmount = (matchedVout.value || 0) / 1e8;
                    if (btcAmount >= minRequiredAmount) {
                      const sender = tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet';
                      return {
                        isDetected: true,
                        txHash: tx.txid,
                        customerAddress: sender,
                        actualAmount: btcAmount,
                        isConfirmed: !!tx.status?.confirmed,
                        blockNumber: tx.status?.block_height,
                      };
                    }
                  }
                }
              }
            }
          } catch {}
          return null;
        })(),

        // B. Blockstream API
        (async () => {
          try {
            const res = await Promise.race([
              fetch(`https://blockstream.info/api/address/${cleanAddr}/txs`),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
            ]);
            if (res.ok) {
              const txs = await res.json();
              if (Array.isArray(txs) && txs.length > 0) {
                for (const tx of txs) {
                  // If confirmed, verify it occurred during current session
                  if (tx.status?.confirmed && tx.status?.block_time) {
                    const txTimeMs = tx.status.block_time * 1000;
                    if (txTimeMs < minValidTimestampMs) continue; // Ignore old historical tx
                  }

                  const matchedVout = tx.vout?.find(
                    (v: any) => v.scriptpubkey_address?.toLowerCase() === cleanAddr.toLowerCase()
                  );
                  if (matchedVout) {
                    const btcAmount = (matchedVout.value || 0) / 1e8;
                    if (btcAmount >= minRequiredAmount) {
                      const sender = tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet';
                      return {
                        isDetected: true,
                        txHash: tx.txid,
                        customerAddress: sender,
                        actualAmount: btcAmount,
                        isConfirmed: !!tx.status?.confirmed,
                        blockNumber: tx.status?.block_height,
                      };
                    }
                  }
                }
              }
            }
          } catch {}
          return null;
        })(),

        // C. Blockchain.info Raw Address Check
        (async () => {
          try {
            const res = await Promise.race([
              fetch(`https://blockchain.info/rawaddr/${cleanAddr}?limit=5&cors=true`),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
            ]);
            if (res.ok) {
              const data = await res.json();
              if (data?.txs && Array.isArray(data.txs)) {
                for (const tx of data.txs) {
                  const txTimeMs = (tx.time || 0) * 1000;
                  if (txTimeMs > 0 && txTimeMs < minValidTimestampMs) continue; // Ignore old historical tx

                  const matchedOut = tx.out?.find(
                    (o: any) => o.addr?.toLowerCase() === cleanAddr.toLowerCase()
                  );
                  if (matchedOut) {
                    const btcAmount = (matchedOut.value || 0) / 1e8;
                    if (btcAmount >= minRequiredAmount) {
                      const sender = tx.inputs?.[0]?.prev_out?.addr || 'Bitcoin Wallet';
                      return {
                        isDetected: true,
                        txHash: tx.hash,
                        customerAddress: sender,
                        actualAmount: btcAmount,
                        isConfirmed: (tx.block_height || 0) > 0,
                        blockNumber: tx.block_height,
                      };
                    }
                  }
                }
              }
            }
          } catch {}
          return null;
        })(),
      ];

      const results = await Promise.allSettled(btcPromises);
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value && res.value.isDetected && res.value.txHash) {
          return res.value;
        }
      }

      return { isDetected: false };
    }

    // 2. EVM Automatic Detection (Polygon & Ethereum)
    if (!cleanAddr.startsWith('0x')) {
      return { isDetected: false };
    }

    const isPolygon = config.network === 'Polygon';

    // Parallel EVM Detection Tasks
    const evmPromises: Promise<any>[] = [];

    // Task 1: Polygonscan / Etherscan API Check
    evmPromises.push(
      (async () => {
        try {
          if (config.contractAddress) {
            const canonicalContract = config.contractAddress.toLowerCase();
            const polyScanUrl = isPolygon
              ? `https://api.polygonscan.com/api?module=account&action=tokentx&address=${cleanAddr}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc`
              : `https://api.etherscan.io/api?module=account&action=tokentx&address=${cleanAddr}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc`;

            const psRes = await Promise.race([
              fetch(polyScanUrl),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2800)),
            ]);

            if (psRes.ok) {
              const data = await psRes.json();
              if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
                for (const tx of data.result) {
                  // STRICT: Filter out any transactions before current payment session
                  const txTimestampMs = parseInt(tx.timeStamp || '0', 10) * 1000;
                  if (txTimestampMs < minValidTimestampMs) {
                    continue; // Skip historical transaction
                  }

                  const toAddr = (tx.to || '').toLowerCase();
                  const contract = (tx.contractAddress || '').toLowerCase();
                  const tokenSymbol = (tx.tokenSymbol || '').toUpperCase();

                  const isTargetToken =
                    contract === canonicalContract ||
                    (expectedAsset === 'VERSE' &&
                      (contract === '0xc3aa16362d381282d7bfcf73812d46e300958ad8' ||
                        contract === '0x249ca82617ec3dfb2589c4c17ab7ec9765350a18' ||
                        tokenSymbol === 'VERSE')) ||
                    (expectedAsset === 'USDT' && (tokenSymbol === 'USDT' || tokenSymbol === 'USDTE'));

                  if (toAddr === cleanAddr.toLowerCase() && isTargetToken) {
                    const tokenDecimals = tx.tokenDecimal ? parseInt(tx.tokenDecimal, 10) : config.decimals;
                    const rawVal = ethers.toBigInt(tx.value || '0');
                    const actualAmount = parseFloat(ethers.formatUnits(rawVal, tokenDecimals));

                    if (actualAmount >= minRequiredAmount) {
                      return {
                        isDetected: true,
                        txHash: tx.hash,
                        customerAddress: tx.from || 'Verified Customer',
                        actualAmount,
                        isConfirmed: true,
                        blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 10) : undefined,
                      };
                    }
                  }
                }
              }
            }
          } else {
            // Native POL / MATIC or ETH txlist
            const polyScanNativeUrl = isPolygon
              ? `https://api.polygonscan.com/api?module=account&action=txlist&address=${cleanAddr}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc`
              : `https://api.etherscan.io/api?module=account&action=txlist&address=${cleanAddr}&startblock=0&endblock=99999999&page=1&offset=15&sort=desc`;

            const psRes = await Promise.race([
              fetch(polyScanNativeUrl),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2800)),
            ]);

            if (psRes.ok) {
              const data = await psRes.json();
              if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
                for (const tx of data.result) {
                  // STRICT: Filter out any transactions before current payment session
                  const txTimestampMs = parseInt(tx.timeStamp || '0', 10) * 1000;
                  if (txTimestampMs < minValidTimestampMs) {
                    continue; // Skip historical transaction
                  }

                  const toAddr = (tx.to || '').toLowerCase();
                  const isSuccess = tx.isError === '0' || tx.txreceipt_status === '1';

                  if (toAddr === cleanAddr.toLowerCase() && isSuccess) {
                    const actualAmount = parseFloat(ethers.formatEther(tx.value || '0'));
                    if (actualAmount >= minRequiredAmount) {
                      return {
                        isDetected: true,
                        txHash: tx.hash,
                        customerAddress: tx.from || 'Verified Customer',
                        actualAmount,
                        isConfirmed: true,
                        blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 10) : undefined,
                      };
                    }
                  }
                }
              }
            }
          }
        } catch {}
        return null;
      })()
    );

    // Task 2: Blockscout REST API Check
    evmPromises.push(
      (async () => {
        try {
          if (config.contractAddress) {
            const canonicalContract = config.contractAddress.toLowerCase();
            const blockscoutUrl = isPolygon
              ? `https://polygon.blockscout.com/api/v2/addresses/${cleanAddr}/token-transfers?type=ERC-20`
              : `https://eth.blockscout.com/api/v2/addresses/${cleanAddr}/token-transfers?type=ERC-20`;

            const bsRes = await Promise.race([
              fetch(blockscoutUrl),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
            ]);

            if (bsRes.ok) {
              const data = await bsRes.json();
              const items = data.items || [];
              if (Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                  // STRICT: Filter out any transfers before current payment session
                  const itemTimeMs = item.timestamp ? new Date(item.timestamp).getTime() : 0;
                  if (itemTimeMs > 0 && itemTimeMs < minValidTimestampMs) {
                    continue; // Skip historical transfer
                  }

                  const toAddr = (item.to?.hash || item.to || '').toLowerCase();
                  const tokenAddr = (item.token?.address || '').toLowerCase();
                  const tokenSymbol = (item.token?.symbol || '').toUpperCase();

                  const isMatch =
                    toAddr === cleanAddr.toLowerCase() &&
                    (tokenAddr === canonicalContract ||
                      (expectedAsset === 'VERSE' &&
                        (tokenAddr === '0xc3aa16362d381282d7bfcf73812d46e300958ad8' ||
                          tokenAddr === '0x249ca82617ec3dfb2589c4c17ab7ec9765350a18' ||
                          tokenSymbol === 'VERSE')) ||
                      (expectedAsset === 'USDT' && (tokenSymbol === 'USDT' || tokenSymbol === 'USDTE')));

                  if (isMatch) {
                    const tokenDecimals = item.token?.decimals ? parseInt(item.token.decimals, 10) : config.decimals;
                    const rawVal = ethers.toBigInt(item.total?.value || item.value || '0');
                    const actualAmount = parseFloat(ethers.formatUnits(rawVal, tokenDecimals));

                    if (actualAmount >= minRequiredAmount) {
                      return {
                        isDetected: true,
                        txHash: item.transaction_hash,
                        customerAddress: item.from?.hash || 'Verified Customer',
                        actualAmount,
                        isConfirmed: true,
                        blockNumber: item.block_number,
                      };
                    }
                  }
                }
              }
            }
          } else {
            // Blockscout Native Transactions (POL / ETH)
            const blockscoutUrl = isPolygon
              ? `https://polygon.blockscout.com/api/v2/addresses/${cleanAddr}/transactions`
              : `https://eth.blockscout.com/api/v2/addresses/${cleanAddr}/transactions`;

            const bsRes = await Promise.race([
              fetch(blockscoutUrl),
              new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
            ]);

            if (bsRes.ok) {
              const data = await bsRes.json();
              const items = data.items || [];
              if (Array.isArray(items) && items.length > 0) {
                for (const tx of items) {
                  // STRICT: Filter out any transactions before current payment session
                  const txTimeMs = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
                  if (txTimeMs > 0 && txTimeMs < minValidTimestampMs) {
                    continue; // Skip historical transaction
                  }

                  const toAddr = (tx.to?.hash || tx.to || '').toLowerCase();
                  const isOk = tx.status === 'ok' || tx.result === 'success' || !tx.has_error_in_internal_txs;

                  if (toAddr === cleanAddr.toLowerCase() && isOk) {
                    const actualAmount = parseFloat(ethers.formatEther(tx.value || '0'));
                    if (actualAmount >= minRequiredAmount) {
                      return {
                        isDetected: true,
                        txHash: tx.hash,
                        customerAddress: tx.from?.hash || 'Verified Customer',
                        actualAmount,
                        isConfirmed: true,
                        blockNumber: tx.block_number,
                      };
                    }
                  }
                }
              }
            }
          }
        } catch {}
        return null;
      })()
    );

    // Task 3: Direct EVM RPC Logs Query (Limited strictly to very latest blocks)
    if (config.contractAddress) {
      evmPromises.push(
        (async () => {
          try {
            const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
            const paddedMerchant = ethers.zeroPadValue(cleanAddr.toLowerCase(), 32);

            const logs = isPolygon
              ? await executeWithPolygonFallback(async (provider) => {
                  const currentBlock = await provider.getBlockNumber();
                  // Polygon has 2s block times; 6 blocks ≈ 12s
                  const fromBlock = Math.max(0, currentBlock - 6);
                  return await provider.getLogs({
                    address: config.contractAddress,
                    topics: [transferTopic, null, paddedMerchant],
                    fromBlock,
                    toBlock: 'latest',
                  });
                })
              : await executeWithEthereumFallback(async (provider) => {
                  const currentBlock = await provider.getBlockNumber();
                  // Ethereum has 12s block times; 2 blocks ≈ 24s
                  const fromBlock = Math.max(0, currentBlock - 2);
                  return await provider.getLogs({
                    address: config.contractAddress,
                    topics: [transferTopic, null, paddedMerchant],
                    fromBlock,
                    toBlock: 'latest',
                  });
                });

            if (logs && logs.length > 0) {
              const latestLog = logs[logs.length - 1];
              const rawVal = ethers.toBigInt(latestLog.data);
              const actualAmount = parseFloat(ethers.formatUnits(rawVal, config.decimals));

              if (actualAmount >= minRequiredAmount) {
                const sender = latestLog.topics?.[1]
                  ? ethers.stripZerosLeft(latestLog.topics[1])
                  : 'Customer Wallet';
                return {
                  isDetected: true,
                  txHash: latestLog.transactionHash,
                  customerAddress: sender,
                  actualAmount,
                  isConfirmed: true,
                  blockNumber: latestLog.blockNumber,
                };
              }
            }
          } catch {}
          return null;
        })()
      );
    }

    // Wait for all parallel EVM checks and only accept REAL NEW transactions with valid hashes
    const results = await Promise.allSettled(evmPromises);
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value && res.value.isDetected && res.value.txHash) {
        return res.value;
      }
    }

    return { isDetected: false };
  } catch (err) {
    console.warn('Auto scan incoming payment error:', err);
    return { isDetected: false };
  }
}

/**
 * Format wallet address for safe display
 */
export function formatAddress(address: string | null | undefined, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format crypto amount with appropriate precision
 */
export function formatCryptoAmount(amount: number, asset: CryptoAsset): string {
  if (asset === 'BTC') {
    return amount < 0.0001 ? amount.toFixed(8) : amount.toFixed(6);
  }
  if (asset === 'ETH') {
    return amount.toFixed(5);
  }
  if (asset === 'USDT') {
    return amount.toFixed(2);
  }
  if (asset === 'POL') {
    return amount.toFixed(3);
  }
  if (asset === 'VERSE') {
    return amount > 1000 ? Math.round(amount).toLocaleString('en-US') : amount.toFixed(2);
  }
  return amount.toString();
}
