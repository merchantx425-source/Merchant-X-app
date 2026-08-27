import { CryptoAsset, CryptoAssetConfig, FiatCurrency, FiatCurrencyConfig } from '../types/merchant';

export const WALLETCONNECT_PROJECT_ID = 
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '31ef6d708552677094488d29f5846014';

export const SUPPORTED_ASSETS: Record<CryptoAsset, CryptoAssetConfig> = {
  VERSE: {
    symbol: 'VERSE',
    name: 'Verse',
    network: 'Polygon',
    networkFamily: 'evm',
    decimals: 18,
    // Official Polygon fxVERSE ERC-20 contract (0xc708D6F2153933DAA50B2D0758955Be0A...)
    contractAddress: '0xc708d6f2153933daa50b2d0758955be0a93a8fec',
    coingeckoId: 'verse-token',
    iconColor: '#00D2FF',
    badge: 'Polygon',
  },
  POL: {
    symbol: 'POL',
    name: 'Polygon Ecosystem',
    network: 'Polygon',
    networkFamily: 'evm',
    decimals: 18,
    coingeckoId: 'matic-network',
    iconColor: '#8247E5',
    badge: 'Polygon',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'Polygon',
    networkFamily: 'evm',
    decimals: 6,
    // Canonical USDT contract address on Polygon (PoS)
    contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    coingeckoId: 'tether',
    iconColor: '#26A17B',
    badge: 'Polygon / ERC-20',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'Polygon',
    networkFamily: 'evm',
    decimals: 6,
    // Canonical Native USDC on Polygon PoS (and bridged 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
    contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    coingeckoId: 'usd-coin',
    iconColor: '#2775CA',
    badge: 'Polygon / ERC-20',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum',
    networkFamily: 'evm',
    decimals: 18,
    coingeckoId: 'ethereum',
    iconColor: '#627EEA',
    badge: 'Ethereum',
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin',
    networkFamily: 'bitcoin',
    decimals: 8,
    coingeckoId: 'bitcoin',
    iconColor: '#F7931A',
    badge: 'Bitcoin',
  },
};

export const ASSET_ORDER: CryptoAsset[] = ['VERSE', 'POL', 'USDT', 'USDC', 'ETH', 'BTC'];

export const SUPPORTED_FIAT: Record<FiatCurrency, FiatCurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    locale: 'en-NG',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    locale: 'en-CA',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    locale: 'en-AU',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    locale: 'ja-JP',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    locale: 'de-CH',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    locale: 'en-ZA',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    locale: 'en-KE',
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    locale: 'en-GH',
  },
};

// Public reliable high-availability RPC Endpoints (CORS-enabled for web apps)
export const RPC_URLS = {
  POLYGON: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.drpc.org',
    'https://1rpc.io/matic',
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.llamarpc.com',
  ],
  ETHEREUM: [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.drpc.org',
    'https://1rpc.io/eth',
    'https://rpc.ankr.com/eth',
    'https://rpc.flashbots.net',
    'https://cloudflare-eth.com',
  ],
  BITCOIN_APIS: [
    'https://mempool.space/api',
    'https://blockstream.info/api',
    'https://blockchain.info',
    'https://api.blockcypher.com/v1/btc/main',
  ],
};

export const EXPLORER_URLS = {
  Polygon: 'https://polygonscan.com',
  Ethereum: 'https://etherscan.io',
  Bitcoin: 'https://mempool.space',
};

// Standard ERC20 ABI snippet for balanceOf & transfer
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
];

export const DEFAULT_SETTINGS = {
  fiatCurrency: 'NGN' as FiatCurrency,
  theme: 'dark' as const,
  language: 'en',
  biometricEnabled: false,
  soundEnabled: true,
  hapticEnabled: true,
  merchantName: 'Merchant X Store #1',
  merchantLocation: 'Lagos, Nigeria',
  customBtcReceivingAddress: '',
  customEvmReceivingAddress: '',
};

// Pro Subscription Configuration
export const PRO_RECEIVING_ADDRESS = '0xc8217F870B77784a68566D677b4dEA9993677964';
export const PRO_PRICE_USD = 10;
export const FREE_MONTHLY_LIMIT = 10;
export const PRO_SUBSCRIPTION_DAYS = 30;
export const PRO_SUBSCRIPTION_MS = PRO_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000;

