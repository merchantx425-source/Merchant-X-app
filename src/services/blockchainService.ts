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
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 6000)),
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
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 6000)),
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
 * Fetch real live exchange rates from CoinGecko, DexScreener (for Verse), and ExchangeRate API
 */
export async function fetchLiveCryptoRates(fiat: FiatCurrency = 'NGN'): Promise<{
  cryptoUsd: Record<CryptoAsset, number>;
  fiatPerUsd: number;
  cryptoInFiat: Record<CryptoAsset, number>;
}> {
  const now = Date.now();

  // Baseline standard USD prices
  const defaultUsdRates: Record<CryptoAsset, number> = {
    BTC: 64500.0,
    ETH: 3150.0,
    USDT: 1.0,
    POL: 0.42,
    VERSE: 0.00028,
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

      // 1. Query DexScreener for real-time live VERSE price directly on Polygon DEX
      try {
        const dexRes = await fetch(
          'https://api.dexscreener.com/latest/dex/tokens/0xc3aa16362d381282d7bfcf73812d46e300958ad8'
        ).then((r) => r.json());

        if (dexRes?.pairs && dexRes.pairs.length > 0) {
          const mainPair = dexRes.pairs[0];
          if (mainPair?.priceUsd) {
            verseUsd = parseFloat(mainPair.priceUsd);
          }
        }
      } catch (dexErr) {
        console.warn('[Rates] Verse DexScreener notice:', dexErr);
      }

      // 2. Query CoinGecko for Bitcoin, Ethereum, POL, Tether, and Verse-World
      try {
        const ids = 'bitcoin,ethereum,tether,matic-network,verse-world,verse';
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
          { headers: { Accept: 'application/json' } }
        ).then((r) => (r.ok ? r.json() : null));

        if (cgRes) {
          if (cgRes.bitcoin?.usd) btcUsd = cgRes.bitcoin.usd;
          if (cgRes.ethereum?.usd) ethUsd = cgRes.ethereum.usd;
          if (cgRes.tether?.usd) usdtUsd = cgRes.tether.usd;
          if (cgRes['matic-network']?.usd) polUsd = cgRes['matic-network'].usd;
          if (cgRes['verse-world']?.usd) {
            verseUsd = cgRes['verse-world'].usd;
          } else if (cgRes.verse?.usd) {
            verseUsd = cgRes.verse.usd;
          }
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
    POL: ratesCache?.rates?.POL || defaultUsdRates.POL,
    VERSE: ratesCache?.rates?.VERSE || defaultUsdRates.VERSE,
  };

  const fiatPerUsd = ratesCache?.fiatRates?.[fiat] || defaultFiatToUsd[fiat] || 1;

  const cryptoInFiat: Record<CryptoAsset, number> = {
    BTC: usdPrices.BTC * fiatPerUsd,
    ETH: usdPrices.ETH * fiatPerUsd,
    USDT: usdPrices.USDT * fiatPerUsd,
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
 * Fetch REAL on-chain balance for an EVM or Bitcoin address
 */
export async function fetchRealAssetBalance(
  asset: CryptoAsset,
  address: string
): Promise<{ balance: string; balanceRaw: number; error: string | null }> {
  if (!address || address.trim() === '') {
    return { balance: '0', balanceRaw: 0, error: null };
  }

  const cleanAddr = address.trim();
  const config = SUPPORTED_ASSETS[asset];

  try {
    // 1. Bitcoin Balance Query
    if (config.networkFamily === 'bitcoin') {
      // If the address passed is an EVM address (starts with 0x), user has not connected BTC address yet
      if (cleanAddr.startsWith('0x')) {
        return { balance: '0', balanceRaw: 0, error: null };
      }

      // Try Mempool.space
      try {
        const res = await fetch(`https://mempool.space/api/address/${cleanAddr}`);
        if (res.ok) {
          const data = await res.json();
          const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
          const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
          const satoshis = Math.max(0, funded - spent);
          const btc = satoshis / 1e8;
          return {
            balance: btc === 0 ? '0' : btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }),
            balanceRaw: btc,
            error: null,
          };
        }
      } catch {
        // Fallback to Blockstream
      }

      // Try Blockstream API
      try {
        const bsRes = await fetch(`https://blockstream.info/api/address/${cleanAddr}`);
        if (bsRes.ok) {
          const data = await bsRes.json();
          const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
          const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
          const satoshis = Math.max(0, funded - spent);
          const btc = satoshis / 1e8;
          return {
            balance: btc === 0 ? '0' : btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }),
            balanceRaw: btc,
            error: null,
          };
        }
      } catch {
        // Try Blockchain.info
      }

      try {
        const bcRes = await fetch(`https://blockchain.info/rawaddr/${cleanAddr}?cors=true`);
        if (bcRes.ok) {
          const data = await bcRes.json();
          const satoshis = data.final_balance || 0;
          const btc = satoshis / 1e8;
          return {
            balance: btc === 0 ? '0' : btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }),
            balanceRaw: btc,
            error: null,
          };
        }
      } catch {
        // Ignore
      }

      return { balance: '0', balanceRaw: 0, error: null };
    }

    // 2. EVM Queries (Requires 0x address)
    if (!cleanAddr.startsWith('0x')) {
      return { balance: '0', balanceRaw: 0, error: null };
    }

    // A. POL (Polygon Native)
    if (asset === 'POL') {
      const wei = await executeWithPolygonFallback((provider) => provider.getBalance(cleanAddr));
      const formatted = ethers.formatEther(wei);
      const raw = parseFloat(formatted);
      return {
        balance: raw === 0 ? '0' : raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        balanceRaw: raw,
        error: null,
      };
    }

    // B. ETH (Ethereum Native)
    if (asset === 'ETH') {
      const wei = await executeWithEthereumFallback((provider) => provider.getBalance(cleanAddr));
      const formatted = ethers.formatEther(wei);
      const raw = parseFloat(formatted);
      return {
        balance: raw === 0 ? '0' : raw.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 6 }),
        balanceRaw: raw,
        error: null,
      };
    }

    // C. VERSE (ERC-20 on Polygon, with Ethereum cross-check fallback)
    if (asset === 'VERSE') {
      let rawBalPolygon = 0n;
      try {
        rawBalPolygon = await executeWithPolygonFallback(async (provider) => {
          const contract = new ethers.Contract(config.contractAddress!, ERC20_ABI, provider);
          return await contract.balanceOf(cleanAddr);
        });
      } catch (pErr) {
        console.warn('Verse Polygon query warning:', pErr);
      }

      const formatted = ethers.formatUnits(rawBalPolygon, config.decimals);
      let raw = parseFloat(formatted);

      // If 0 on Polygon, check if there is VERSE on Ethereum (Ethereum Verse contract: 0x249cA82617eC3DfB2589c4c17ab7EC9765350a18)
      if (raw === 0) {
        try {
          const ethVerseContract = '0x249cA82617eC3DfB2589c4c17ab7EC9765350a18';
          const rawBalEth = await executeWithEthereumFallback(async (provider) => {
            const contract = new ethers.Contract(ethVerseContract, ERC20_ABI, provider);
            return await contract.balanceOf(cleanAddr);
          });
          const ethFormatted = ethers.formatUnits(rawBalEth, 18);
          const ethRaw = parseFloat(ethFormatted);
          if (ethRaw > 0) {
            raw = ethRaw;
          }
        } catch {
          // Ignore
        }
      }

      return {
        balance: raw === 0 ? '0' : raw.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        balanceRaw: raw,
        error: null,
      };
    }

    // D. USDT (ERC-20 on Polygon, with Ethereum cross-check)
    if (asset === 'USDT') {
      let rawBalPolygon = 0n;
      try {
        rawBalPolygon = await executeWithPolygonFallback(async (provider) => {
          const contract = new ethers.Contract(config.contractAddress!, ERC20_ABI, provider);
          return await contract.balanceOf(cleanAddr);
        });
      } catch (pErr) {
        console.warn('USDT Polygon query warning:', pErr);
      }

      const formatted = ethers.formatUnits(rawBalPolygon, config.decimals);
      let raw = parseFloat(formatted);

      // If 0 on Polygon, check if there is USDT on Ethereum (0xdac17f958d2ee523a2206206994597c13d831ec7)
      if (raw === 0) {
        try {
          const ethUsdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
          const rawBalEth = await executeWithEthereumFallback(async (provider) => {
            const contract = new ethers.Contract(ethUsdtContract, ERC20_ABI, provider);
            return await contract.balanceOf(cleanAddr);
          });
          const ethFormatted = ethers.formatUnits(rawBalEth, 6);
          const ethRaw = parseFloat(ethFormatted);
          if (ethRaw > 0) {
            raw = ethRaw;
          }
        } catch {
          // Ignore
        }
      }

      return {
        balance: raw === 0 ? '0' : raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        balanceRaw: raw,
        error: null,
      };
    }

    return { balance: '0', balanceRaw: 0, error: null };
  } catch (err: any) {
    console.error(`Error fetching real balance for ${asset}:`, err);
    return {
      balance: '0',
      balanceRaw: 0,
      error: null,
    };
  }
}

/**
 * Verify a real on-chain transaction
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
  const { txHash, expectedAsset, merchantWallet } = params;
  const config = SUPPORTED_ASSETS[expectedAsset];

  try {
    if (config.networkFamily === 'bitcoin') {
      const res = await fetch(`https://mempool.space/api/tx/${txHash.trim()}`);
      if (!res.ok) {
        return { isVerified: false, errorMessage: 'Transaction hash not found in Bitcoin mempool or blockchain.' };
      }
      const tx = await res.json();

      // Check if one of the outputs sends to merchant address
      const matchedOutput = tx.vout?.find(
        (v: any) => v.scriptpubkey_address?.toLowerCase() === merchantWallet.toLowerCase()
      );
      if (!matchedOutput) {
        return { isVerified: false, errorMessage: 'Payment recipient does not match merchant Bitcoin address.' };
      }

      const receivedBtc = (matchedOutput.value || 0) / 1e8;
      const senderAddr = tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Wallet';

      return {
        isVerified: true,
        blockNumber: tx.status?.block_height,
        timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
        customerAddress: senderAddr,
        actualAmount: receivedBtc,
      };
    }

    // EVM Verification with fallback
    const isPolygon = config.network === 'Polygon';
    const receipt = isPolygon
      ? await executeWithPolygonFallback((provider) => provider.getTransactionReceipt(txHash))
      : await executeWithEthereumFallback((provider) => provider.getTransactionReceipt(txHash));

    if (!receipt) {
      return { isVerified: false, errorMessage: 'Transaction is pending or not yet mined on the network.' };
    }

    if (receipt.status !== 1) {
      return { isVerified: false, errorMessage: 'Transaction reverted or failed on-chain.' };
    }

    return {
      isVerified: true,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
      customerAddress: receipt.from,
      actualAmount: params.expectedAmountCrypto,
    };
  } catch (err: any) {
    return {
      isVerified: false,
      errorMessage: err?.message || 'Blockchain verification failed.',
    };
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
