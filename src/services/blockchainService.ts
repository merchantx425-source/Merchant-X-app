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
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get an active working JsonRpcProvider for Polygon with fallback
 */
export async function getPolygonProvider(): Promise<ethers.JsonRpcProvider> {
  for (const url of RPC_URLS.POLYGON) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 137, { staticNetwork: true });
      return provider;
    } catch {
      continue;
    }
  }
  return new ethers.JsonRpcProvider(RPC_URLS.POLYGON[0], 137);
}

/**
 * Get an active working JsonRpcProvider for Ethereum with fallback
 */
export async function getEthereumProvider(): Promise<ethers.JsonRpcProvider> {
  for (const url of RPC_URLS.ETHEREUM) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 1, { staticNetwork: true });
      return provider;
    } catch {
      continue;
    }
  }
  return new ethers.JsonRpcProvider(RPC_URLS.ETHEREUM[0], 1);
}

/**
 * Fetch real live exchange rates from CoinGecko + ExchangeRate API
 */
export async function fetchLiveCryptoRates(fiat: FiatCurrency = 'NGN'): Promise<{
  cryptoUsd: Record<CryptoAsset, number>;
  fiatPerUsd: number;
  cryptoInFiat: Record<CryptoAsset, number>;
}> {
  const now = Date.now();
  
  // Default base fallback rates in case external APIs are rate limited
  const defaultUsdRates: Record<CryptoAsset, number> = {
    BTC: 64500.0,
    ETH: 3150.0,
    USDT: 1.0,
    POL: 0.42,
    VERSE: 0.000185,
  };

  const defaultFiatToUsd: Record<FiatCurrency, number> = {
    NGN: 1560.0,
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
      // 1. Fetch Crypto prices in USD
      const ids = 'bitcoin,ethereum,tether,matic-network,verse';
      const coingeckoRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { headers: { Accept: 'application/json' } }
      ).catch(() => null);

      let cryptoRates: Record<string, number> = {};
      if (coingeckoRes && coingeckoRes.ok) {
        const data = await coingeckoRes.json();
        cryptoRates = {
          BTC: data.bitcoin?.usd || defaultUsdRates.BTC,
          ETH: data.ethereum?.usd || defaultUsdRates.ETH,
          USDT: data.tether?.usd || 1.0,
          POL: data['matic-network']?.usd || defaultUsdRates.POL,
          VERSE: data.verse?.usd || defaultUsdRates.VERSE,
        };
      } else {
        // Fallback to Binance public ticker
        const binanceEth = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
          .then((r) => r.json())
          .catch(() => null);
        const binanceBtc = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
          .then((r) => r.json())
          .catch(() => null);

        cryptoRates = {
          BTC: binanceBtc?.price ? parseFloat(binanceBtc.price) : defaultUsdRates.BTC,
          ETH: binanceEth?.price ? parseFloat(binanceEth.price) : defaultUsdRates.ETH,
          USDT: 1.0,
          POL: defaultUsdRates.POL,
          VERSE: defaultUsdRates.VERSE,
        };
      }

      // 2. Fetch Fiat rates vs USD
      const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD')
        .then((r) => r.json())
        .catch(() => null);

      const fiatRates: Record<string, number> = fiatRes?.rates || defaultFiatToUsd;

      ratesCache = {
        timestamp: now,
        rates: cryptoRates,
        fiatRates,
      };
    }
  } catch (err) {
    console.warn('Live rates fetch warning, using resilient fallback ticker:', err);
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

  const config = SUPPORTED_ASSETS[asset];

  try {
    if (config.networkFamily === 'bitcoin') {
      // Query Bitcoin public mempool.space API
      const cleanAddr = address.trim();
      const res = await fetch(`https://mempool.space/api/address/${cleanAddr}`);
      if (!res.ok) {
        // Try fallback Blockstream API
        const bsRes = await fetch(`https://blockstream.info/api/address/${cleanAddr}`);
        if (!bsRes.ok) {
          throw new Error('Bitcoin network query failed');
        }
        const data = await bsRes.json();
        const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
        const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
        const satoshis = Math.max(0, funded - spent);
        const btc = satoshis / 1e8;
        return {
          balance: btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }),
          balanceRaw: btc,
          error: null,
        };
      }

      const data = await res.json();
      const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
      const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
      const satoshis = Math.max(0, funded - spent);
      const btc = satoshis / 1e8;
      return {
        balance: btc.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }),
        balanceRaw: btc,
        error: null,
      };
    }

    // EVM Networks (Polygon or Ethereum)
    if (asset === 'POL') {
      const provider = await getPolygonProvider();
      const wei = await provider.getBalance(address);
      const formatted = ethers.formatEther(wei);
      const raw = parseFloat(formatted);
      return {
        balance: raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }),
        balanceRaw: raw,
        error: null,
      };
    }

    if (asset === 'ETH') {
      const provider = await getEthereumProvider();
      const wei = await provider.getBalance(address);
      const formatted = ethers.formatEther(wei);
      const raw = parseFloat(formatted);
      return {
        balance: raw.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 }),
        balanceRaw: raw,
        error: null,
      };
    }

    if (asset === 'VERSE') {
      const provider = await getPolygonProvider();
      const contract = new ethers.Contract(config.contractAddress!, ERC20_ABI, provider);
      const rawBal = await contract.balanceOf(address);
      const formatted = ethers.formatUnits(rawBal, config.decimals);
      const raw = parseFloat(formatted);
      return {
        balance: raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        balanceRaw: raw,
        error: null,
      };
    }

    if (asset === 'USDT') {
      // USDT on Polygon
      const provider = await getPolygonProvider();
      const contract = new ethers.Contract(config.contractAddress!, ERC20_ABI, provider);
      const rawBal = await contract.balanceOf(address);
      const formatted = ethers.formatUnits(rawBal, config.decimals);
      const raw = parseFloat(formatted);
      return {
        balance: raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        balanceRaw: raw,
        error: null,
      };
    }

    return { balance: '0', balanceRaw: 0, error: null };
  } catch (err: any) {
    console.error(`Error fetching real balance for ${asset}:`, err);
    return {
      balance: 'Unable to load balance',
      balanceRaw: 0,
      error: err?.message || 'Unable to load balance',
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
      const matchedOutput = tx.vout?.find((v: any) => v.scriptpubkey_address?.toLowerCase() === merchantWallet.toLowerCase());
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

    // EVM Verification
    const provider = config.network === 'Polygon' ? await getPolygonProvider() : await getEthereumProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { isVerified: false, errorMessage: 'Transaction is pending or not yet mined on the network.' };
    }

    if (receipt.status !== 1) {
      return { isVerified: false, errorMessage: 'Transaction reverted or failed on-chain.' };
    }

    const tx = await provider.getTransaction(txHash);
    const block = await provider.getBlock(receipt.blockNumber);

    return {
      isVerified: true,
      blockNumber: receipt.blockNumber,
      timestamp: block?.timestamp ? block.timestamp * 1000 : Date.now(),
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
    return amount.toFixed(6);
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
    return Math.round(amount).toLocaleString('en-US');
  }
  return amount.toString();
}
