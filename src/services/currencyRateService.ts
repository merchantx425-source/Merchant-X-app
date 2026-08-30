import { CryptoAsset, FiatCurrency } from '../types/merchant';
import { SUPPORTED_ASSETS, SUPPORTED_FIAT } from '../config/constants';
import { fetchLiveCryptoRates, LiveRatesResult } from './blockchainService';

export type CurrencyType = 'fiat' | 'crypto';

export interface CurrencyItem {
  id: string; // e.g. 'USD', 'NGN', 'BTC', 'VERSE'
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  decimals: number;
  badge?: string;
  iconColor?: string;
  network?: string;
  flag?: string;
}

// Full list of supported Fiat currencies for the calculator
export const CALCULATOR_FIAT_LIST: CurrencyItem[] = [
  { id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat', decimals: 2, flag: '🇺🇸' },
  { id: 'NGN', code: 'NGN', name: 'Nigerian Naira', symbol: '₦', type: 'fiat', decimals: 2, flag: '🇳🇬' },
  { id: 'EUR', code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', decimals: 2, flag: '🇪🇺' },
  { id: 'GBP', code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat', decimals: 2, flag: '🇬🇧' },
  { id: 'CAD', code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', type: 'fiat', decimals: 2, flag: '🇨🇦' },
  { id: 'AUD', code: 'AUD', name: 'Australian Dollar', symbol: 'A$', type: 'fiat', decimals: 2, flag: '🇦🇺' },
  { id: 'JPY', code: 'JPY', name: 'Japanese Yen', symbol: '¥', type: 'fiat', decimals: 0, flag: '🇯🇵' },
  { id: 'CHF', code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', type: 'fiat', decimals: 2, flag: '🇨🇭' },
  { id: 'ZAR', code: 'ZAR', name: 'South African Rand', symbol: 'R', type: 'fiat', decimals: 2, flag: '🇿🇦' },
  { id: 'KES', code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', type: 'fiat', decimals: 2, flag: '🇰🇪' },
  { id: 'GHS', code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', type: 'fiat', decimals: 2, flag: '🇬🇭' },
  { id: 'AED', code: 'AED', name: 'UAE Dirham', symbol: 'AED', type: 'fiat', decimals: 2, flag: '🇦🇪' },
  { id: 'BRL', code: 'BRL', name: 'Brazilian Real', symbol: 'R$', type: 'fiat', decimals: 2, flag: '🇧🇷' },
  { id: 'INR', code: 'INR', name: 'Indian Rupee', symbol: '₹', type: 'fiat', decimals: 2, flag: '🇮🇳' },
  { id: 'CNY', code: 'CNY', name: 'Chinese Yuan', symbol: '¥', type: 'fiat', decimals: 2, flag: '🇨🇳' },
  { id: 'SGD', code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', type: 'fiat', decimals: 2, flag: '🇸🇬' },
];

// Supported Cryptocurrencies in Merchant X
export const CALCULATOR_CRYPTO_LIST: CurrencyItem[] = [
  {
    id: 'VERSE',
    code: 'VERSE',
    name: 'Verse',
    symbol: 'VERSE',
    type: 'crypto',
    decimals: 2,
    badge: 'Polygon / ERC-20',
    iconColor: '#00D2FF',
    network: 'Polygon',
  },
  {
    id: 'BTC',
    code: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto',
    decimals: 8,
    badge: 'Bitcoin Network',
    iconColor: '#F7931A',
    network: 'Bitcoin',
  },
  {
    id: 'ETH',
    code: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto',
    decimals: 6,
    badge: 'Ethereum Mainnet',
    iconColor: '#627EEA',
    network: 'Ethereum',
  },
  {
    id: 'POL',
    code: 'POL',
    name: 'Polygon Ecosystem',
    symbol: 'POL',
    type: 'crypto',
    decimals: 4,
    badge: 'Polygon PoS',
    iconColor: '#8247E5',
    network: 'Polygon',
  },
  {
    id: 'USDT',
    code: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    type: 'crypto',
    decimals: 2,
    badge: 'Polygon / ERC-20',
    iconColor: '#26A17B',
    network: 'Polygon',
  },
  {
    id: 'USDC',
    code: 'USDC',
    name: 'USD Coin',
    symbol: 'USDC',
    type: 'crypto',
    decimals: 2,
    badge: 'Polygon / ERC-20',
    iconColor: '#2775CA',
    network: 'Polygon',
  },
];

export const ALL_CURRENCIES: CurrencyItem[] = [
  ...CALCULATOR_FIAT_LIST,
  ...CALCULATOR_CRYPTO_LIST,
];

export const CURRENCY_MAP: Record<string, CurrencyItem> = ALL_CURRENCIES.reduce(
  (acc, it) => {
    acc[it.id] = it;
    return acc;
  },
  {} as Record<string, CurrencyItem>
);

export interface ConversionResult {
  fromCurrency: CurrencyItem;
  toCurrency: CurrencyItem;
  amount: number;
  convertedAmount: number;
  rate: number; // 1 from = X to
  inverseRate: number; // 1 to = Y from
  formattedResult: string;
  formattedRate: string;
  isAvailable: boolean;
  timestamp: number;
  error?: string | null;
}

/**
 * Get unit price in USD for any supported currency (Fiat or Crypto)
 */
export function getUsdUnitPrice(
  currencyId: string,
  liveData: LiveRatesResult | null
): { priceUsd: number; isAvailable: boolean } {
  if (!liveData) {
    return { priceUsd: 0, isAvailable: false };
  }

  const item = CURRENCY_MAP[currencyId];
  if (!item) {
    return { priceUsd: 0, isAvailable: false };
  }

  // 1. If USD
  if (currencyId === 'USD') {
    return { priceUsd: 1.0, isAvailable: true };
  }

  // 2. If Crypto
  if (item.type === 'crypto') {
    const cryptoSym = currencyId as CryptoAsset;
    const usdVal = liveData.cryptoUsd[cryptoSym];
    if (typeof usdVal === 'number' && usdVal > 0) {
      return { priceUsd: usdVal, isAvailable: true };
    }
    return { priceUsd: 0, isAvailable: false };
  }

  // 3. If Fiat (USD -> Fiat rate: e.g. 1 USD = 1580 NGN, so 1 NGN = 1/1580 USD)
  const fiatPerUsd = liveData.fiatRates[currencyId];
  if (typeof fiatPerUsd === 'number' && fiatPerUsd > 0) {
    return { priceUsd: 1.0 / fiatPerUsd, isAvailable: true };
  }

  return { priceUsd: 0, isAvailable: false };
}

/**
 * Calculate multi-currency conversion between any supported pair (Fiat-to-Fiat, Crypto-to-Fiat, Fiat-to-Crypto, Crypto-to-Crypto)
 */
export function calculateConversion(
  amount: number,
  fromCurrencyId: string,
  toCurrencyId: string,
  liveData: LiveRatesResult | null
): ConversionResult {
  const fromCurrency = CURRENCY_MAP[fromCurrencyId] || CURRENCY_MAP.USD;
  const toCurrency = CURRENCY_MAP[toCurrencyId] || CURRENCY_MAP.NGN;

  if (fromCurrencyId === toCurrencyId) {
    return {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: amount,
      rate: 1,
      inverseRate: 1,
      formattedResult: formatCurrencyValue(amount, toCurrency),
      formattedRate: `1 ${fromCurrency.code} = 1 ${toCurrency.code}`,
      isAvailable: true,
      timestamp: liveData?.timestamp || Date.now(),
    };
  }

  const fromUsd = getUsdUnitPrice(fromCurrencyId, liveData);
  const toUsd = getUsdUnitPrice(toCurrencyId, liveData);

  if (!fromUsd.isAvailable || !toUsd.isAvailable || fromUsd.priceUsd <= 0 || toUsd.priceUsd <= 0) {
    return {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: 0,
      rate: 0,
      inverseRate: 0,
      formattedResult: 'Rate unavailable',
      formattedRate: 'Rate unavailable',
      isAvailable: false,
      timestamp: Date.now(),
      error: 'Unable to retrieve live exchange rate',
    };
  }

  // 1 unit of fromCurrency in USD = fromUsd.priceUsd
  // 1 unit of toCurrency in USD = toUsd.priceUsd
  // Rate (1 from = X to) = fromUsd.priceUsd / toUsd.priceUsd
  const rate = fromUsd.priceUsd / toUsd.priceUsd;
  const inverseRate = toUsd.priceUsd / fromUsd.priceUsd;
  const convertedAmount = amount * rate;

  return {
    fromCurrency,
    toCurrency,
    amount,
    convertedAmount,
    rate,
    inverseRate,
    formattedResult: formatCurrencyValue(convertedAmount, toCurrency),
    formattedRate: `1 ${fromCurrency.code} ≈ ${formatRateValue(rate, toCurrency)} ${toCurrency.code}`,
    isAvailable: true,
    timestamp: liveData?.timestamp || Date.now(),
  };
}

/**
 * Format currency value with appropriate precision
 */
export function formatCurrencyValue(value: number, currency: CurrencyItem): string {
  if (isNaN(value) || value === null || value === undefined) {
    return `${currency.symbol}0`;
  }

  if (currency.type === 'fiat') {
    if (value === 0) return `${currency.symbol}0.00`;
    
    // For zero-decimal currencies like JPY
    if (currency.decimals === 0) {
      return `${currency.symbol}${Math.round(value).toLocaleString('en-US')}`;
    }

    return `${currency.symbol}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Crypto Formatting
  if (value === 0) return `0 ${currency.code}`;

  if (currency.id === 'BTC') {
    if (value < 0.00000001) return `< 0.00000001 BTC`;
    const str = value.toFixed(8).replace(/\.?0+$/, '');
    return `${str} BTC`;
  }

  if (currency.id === 'ETH') {
    if (value < 0.000001) return `${value.toFixed(8).replace(/\.?0+$/, '')} ETH`;
    const str = value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
    return `${str} ETH`;
  }

  if (currency.id === 'VERSE') {
    if (value >= 1000) {
      return `${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} VERSE`;
    }
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    })} VERSE`;
  }

  if (currency.id === 'POL') {
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    })} POL`;
  }

  if (currency.id === 'USDT' || currency.id === 'USDC') {
    return `${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} ${currency.code}`;
  }

  return `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${currency.code}`;
}

/**
 * Format rate value with dynamic precision
 */
export function formatRateValue(rate: number, toCurrency: CurrencyItem): string {
  if (rate <= 0 || isNaN(rate)) return '0';

  if (toCurrency.type === 'crypto') {
    if (toCurrency.id === 'BTC') return rate.toFixed(8).replace(/\.?0+$/, '');
    if (toCurrency.id === 'ETH') return rate.toFixed(6).replace(/\.?0+$/, '');
    if (toCurrency.id === 'VERSE') {
      return rate >= 1 ? rate.toLocaleString('en-US', { maximumFractionDigits: 2 }) : rate.toFixed(6);
    }
    return rate.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }

  if (rate < 0.0001) return rate.toFixed(8);
  if (rate < 0.01) return rate.toFixed(6);
  if (rate < 1) return rate.toFixed(4);
  if (rate > 10000) return rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
