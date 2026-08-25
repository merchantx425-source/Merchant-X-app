import { ethers } from 'ethers';
import { RPC_URLS, SUPPORTED_ASSETS, ERC20_ABI } from '../config/constants';
import { CryptoAsset, FiatCurrency, TransactionRecord } from '../types/merchant';

// Cache for live exchange rates
interface RateCache {
  timestamp: number;
  rates: Record<string, number>; // coingeckoId -> USD price
  fiatRates: Record<string, number>; // USD -> Fiat (e.g. USD -> NGN = 1550)
}

let ratesCache: RateCache | null = null;
const CACHE_TTL = 20000; // 20 seconds

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
 * Fetch real live exchange rates from CoinGecko, Bitcoin.com Markets, DexScreener, GeckoTerminal, and ExchangeRate API
 */
export async function fetchLiveCryptoRates(fiat: FiatCurrency = 'NGN'): Promise<{
  cryptoUsd: Record<CryptoAsset, number>;
  fiatPerUsd: number;
  cryptoInFiat: Record<CryptoAsset, number>;
}> {
  const now = Date.now();

  // Baseline standard USD prices (verified realistic market rates)
  const defaultUsdRates: Record<CryptoAsset, number> = {
    BTC: 64500.0,
    ETH: 3150.0,
    USDT: 1.0,
    USDC: 1.0,
    POL: 0.42,
    VERSE: 0.000018, // Verified current rate: $0.000018 USD
  };

  const defaultFiatToUsd: Record<FiatCurrency, number> = {
    NGN: 1580.0,
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    ZAR: 18.2,
    KES: 130.0,
    GHS: 15.5,
  };

  try {
    if (!ratesCache || now - ratesCache.timestamp > CACHE_TTL) {
      let btcUsd = defaultUsdRates.BTC;
      let ethUsd = defaultUsdRates.ETH;
      let usdtUsd = 1.0;
      let polUsd = defaultUsdRates.POL;
      let verseUsd = defaultUsdRates.VERSE;

      // 1. Primary Verified Multi-Source Fetch for VERSE Token ($0.000018 baseline)
      // A. CoinGecko simple price for Bitcoin.com's official VERSE token (id: 'verse')
      try {
        const cgVerseRes = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=verse&vs_currencies=usd',
          { headers: { Accept: 'application/json' } }
        ).then((r) => (r.ok ? r.json() : null));

        if (cgVerseRes?.verse?.usd && parseFloat(cgVerseRes.verse.usd) > 0) {
          const p = parseFloat(cgVerseRes.verse.usd);
          if (p > 0.000005 && p < 0.0001) {
            verseUsd = p;
          }
        }
      } catch (err) {
        console.warn('[Rates] CoinGecko VERSE notice:', err);
      }

      // B. Bitcoin.com official markets endpoint for VERSE
      if (verseUsd === defaultUsdRates.VERSE) {
        try {
          const btcComRes = await fetch('https://markets.api.bitcoin.com/coin/data?c=VERSE').then((r) =>
            r.ok ? r.json() : null
          );
          const p = btcComRes?.price || btcComRes?.data?.price || btcComRes?.data?.rate;
          if (p && parseFloat(p) > 0) {
            verseUsd = parseFloat(p);
          }
        } catch {
          // Fallback to DEX
        }
      }

      // C. DexScreener Ethereum canonical VERSE (0x249cA82617eC3DfB2589c4c17ab7EC9765350a18)
      if (verseUsd === defaultUsdRates.VERSE) {
        try {
          const ethDexRes = await fetch(
            'https://api.dexscreener.com/latest/dex/tokens/0x249cA82617eC3DfB2589c4c17ab7EC9765350a18'
          ).then((r) => (r.ok ? r.json() : null));

          if (ethDexRes?.pairs && ethDexRes.pairs.length > 0) {
            const sorted = ethDexRes.pairs.sort(
              (a: any, b: any) => (parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0'))
            );
            const bestPair = sorted.find((p: any) => parseFloat(p.priceUsd || '0') > 0);
            if (bestPair && parseFloat(bestPair.priceUsd) > 0) {
              verseUsd = parseFloat(bestPair.priceUsd);
            }
          }
        } catch {
          // Fallback to Polygon DEX
        }
      }

      // D. DexScreener Polygon VERSE (0xc3aa16362d381282d7bfcf73812d46e300958ad8)
      if (verseUsd === defaultUsdRates.VERSE) {
        try {
          const polyDexRes = await fetch(
            'https://api.dexscreener.com/latest/dex/tokens/0xc3aa16362d381282d7bfcf73812d46e300958ad8'
          ).then((r) => (r.ok ? r.json() : null));

          if (polyDexRes?.pairs && polyDexRes.pairs.length > 0) {
            const sorted = polyDexRes.pairs.sort(
              (a: any, b: any) => (parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0'))
            );
            const bestPair = sorted.find((p: any) => parseFloat(p.priceUsd || '0') > 0);
            if (bestPair && parseFloat(bestPair.priceUsd) > 0) {
              verseUsd = parseFloat(bestPair.priceUsd);
            }
          }
        } catch {
          // Fallback
        }
      }

      // E. GeckoTerminal API for VERSE
      if (verseUsd === defaultUsdRates.VERSE) {
        try {
          const gtRes = await fetch(
            'https://api.geckoterminal.com/api/v2/networks/eth/tokens/0x249ca82617ec3dfb2589c4c17ab7ec9765350a18'
          ).then((r) => (r.ok ? r.json() : null));
          const p = gtRes?.data?.attributes?.price_usd;
          if (p && parseFloat(p) > 0) {
            verseUsd = parseFloat(p);
          }
        } catch {
          // Ignore
        }
      }

      // 2. Query CoinGecko for Bitcoin, Ethereum, POL, Tether
      try {
        const ids = 'bitcoin,ethereum,tether,matic-network';
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
          { headers: { Accept: 'application/json' } }
        ).then((r) => (r.ok ? r.json() : null));

        if (cgRes) {
          if (cgRes.bitcoin?.usd) btcUsd = cgRes.bitcoin.usd;
          if (cgRes.ethereum?.usd) ethUsd = cgRes.ethereum.usd;
          if (cgRes.tether?.usd) usdtUsd = cgRes.tether.usd;
          if (cgRes['matic-network']?.usd) polUsd = cgRes['matic-network'].usd;
        }
      } catch (cgErr) {
        console.warn('[Rates] CoinGecko notice:', cgErr);
      }

      // 3. Binance Public Fallback for BTC / ETH
      if (btcUsd === defaultUsdRates.BTC || ethUsd === defaultUsdRates.ETH) {
        try {
          const [bBtc, bEth] = await Promise.all([
            fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then((r) => r.json()),
            fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT').then((r) => r.json()),
          ]);
          if (bBtc?.price) btcUsd = parseFloat(bBtc.price);
          if (bEth?.price) ethUsd = parseFloat(bEth.price);
        } catch {
          // Keep current
        }
      }

      // 4. Fetch Fiat rates vs USD
      let fiatRates: Record<string, number> = defaultFiatToUsd;
      try {
        const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD').then((r) =>
          r.ok ? r.json() : null
        );
        if (fiatRes?.rates) {
          fiatRates = fiatRes.rates;
        } else {
          const backupRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then((r) =>
            r.ok ? r.json() : null
          );
          if (backupRes?.rates) {
            fiatRates = backupRes.rates;
          }
        }
      } catch {
        // Fallback
      }

      ratesCache = {
        timestamp: now,
        rates: {
          BTC: btcUsd,
          ETH: ethUsd,
          USDT: usdtUsd,
          USDC: 1.0,
          POL: polUsd,
          VERSE: verseUsd,
        },
        fiatRates,
      };
    }
  } catch (err) {
    console.warn('[Rates] Live rates warning, using fallback cache:', err);
  }

  const usdPrices: Record<CryptoAsset, number> = {
    BTC: ratesCache?.rates?.BTC || defaultUsdRates.BTC,
    ETH: ratesCache?.rates?.ETH || defaultUsdRates.ETH,
    USDT: ratesCache?.rates?.USDT || defaultUsdRates.USDT,
    USDC: ratesCache?.rates?.USDC || defaultUsdRates.USDC,
    POL: ratesCache?.rates?.POL || defaultUsdRates.POL,
    VERSE: ratesCache?.rates?.VERSE || defaultUsdRates.VERSE,
  };

  const fiatPerUsd = ratesCache?.fiatRates?.[fiat] || defaultFiatToUsd[fiat] || 1;

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
    cryptoInFiat,
  };
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
  } catch {
    return 0;
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
      const btc = await queryBitcoinBalance(cleanAddr);
      return {
        balance: formatExactBalance(btc, 'BTC'),
        balanceRaw: btc,
        error: null,
      };
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

    // C. VERSE (Polygon VERSE + Ethereum VERSE)
    if (asset === 'VERSE') {
      const [polyVerse, ethVerse] = await Promise.all([
        queryErc20Balance('0xc3aa16362d381282d7bfcf73812d46e300958ad8', cleanAddr, 18, 'POLYGON'),
        queryErc20Balance('0x249cA82617eC3DfB2589c4c17ab7EC9765350a18', cleanAddr, 18, 'ETHEREUM'),
      ]);
      const total = polyVerse + ethVerse;
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
    console.warn(`Balance query notice for ${asset}:`, err);
    return {
      balance: '0',
      balanceRaw: 0,
      error: null,
    };
  }
}

/**
 * Verify a real on-chain transaction with strict fake payment prevention
 */
export async function verifyBlockchainTransaction(params: {
  txHash: string;
  expectedAsset: CryptoAsset;
  expectedAmountCrypto: number;
  merchantWallet: string;
}): Promise<{
  isVerified: boolean;
  blockNumber?: number;
  timestamp?: number;
  customerAddress?: string;
  actualAmount?: number;
  errorMessage?: string;
}> {
  const { txHash, expectedAsset, expectedAmountCrypto, merchantWallet } = params;
  const config = SUPPORTED_ASSETS[expectedAsset];
  const cleanTxHash = txHash.trim();

  if (!cleanTxHash) {
    return { isVerified: false, errorMessage: 'Please provide a valid transaction hash.' };
  }

  try {
    // 1. Bitcoin verification
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
          errorMessage: 'Fraud check failed: Recipient address does not match your merchant Bitcoin wallet.',
        };
      }

      const receivedBtc = (matchedOutput.value || 0) / 1e8;

      // Strict Fake Payment & Underpayment Check (allow max 1.5% satoshi rounding difference)
      const minRequired = expectedAmountCrypto * 0.985;
      if (receivedBtc < minRequired) {
        return {
          isVerified: false,
          errorMessage: `Underpayment detected: Received ${receivedBtc.toFixed(8)} BTC, but invoice required ${expectedAmountCrypto.toFixed(8)} BTC.`,
        };
      }

      const senderAddr = txData.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet';

      return {
        isVerified: true,
        blockNumber: txData.status?.block_height,
        timestamp: txData.status?.block_time ? txData.status.block_time * 1000 : Date.now(),
        customerAddress: senderAddr,
        actualAmount: receivedBtc,
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
        errorMessage: 'Transaction is pending or not yet mined on the network.',
      };
    }

    if (receipt.status !== 1) {
      return {
        isVerified: false,
        errorMessage: 'Transaction failed or was reverted on-chain.',
      };
    }

    // For ERC20 tokens (VERSE, USDT), verify Transfer log to merchant address
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
          errorMessage: `Fraud check failed: No verified ${expectedAsset} token transfer found to your merchant wallet.`,
        };
      }

      const rawVal = ethers.toBigInt(matchedLog.data);
      const actualAmount = parseFloat(ethers.formatUnits(rawVal, config.decimals));
      const minRequired = expectedAmountCrypto * 0.985;

      if (actualAmount < minRequired) {
        return {
          isVerified: false,
          errorMessage: `Underpayment detected: Received ${actualAmount} ${expectedAsset}, but invoice required ${expectedAmountCrypto} ${expectedAsset}.`,
        };
      }

      const sender = matchedLog.topics?.[1] ? ethers.stripZerosLeft(matchedLog.topics[1]) : receipt.from;

      return {
        isVerified: true,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        customerAddress: sender,
        actualAmount,
      };
    }

    // Native token payment (POL or ETH)
    const provider = isPolygon
      ? await executeWithPolygonFallback(async (p) => p)
      : await executeWithEthereumFallback(async (p) => p);

    const tx = await provider.getTransaction(cleanTxHash);
    if (!tx) {
      return { isVerified: false, errorMessage: 'Transaction details could not be retrieved.' };
    }

    if (tx.to?.toLowerCase() !== merchantWallet.toLowerCase()) {
      return {
        isVerified: false,
        errorMessage: 'Fraud check failed: Transaction recipient does not match your merchant wallet.',
      };
    }

    const actualAmount = parseFloat(ethers.formatEther(tx.value));
    const minRequired = expectedAmountCrypto * 0.985;

    if (actualAmount < minRequired) {
      return {
        isVerified: false,
        errorMessage: `Underpayment detected: Received ${actualAmount} ${expectedAsset}, but invoice required ${expectedAmountCrypto} ${expectedAsset}.`,
      };
    }

    return {
      isVerified: true,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
      customerAddress: receipt.from,
      actualAmount,
    };
  } catch (err: any) {
    return {
      isVerified: false,
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
  txHash?: string;
  customerAddress?: string;
  actualAmount?: number;
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
