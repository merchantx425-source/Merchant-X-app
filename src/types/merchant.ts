export type CryptoAsset = 'VERSE' | 'POL' | 'USDT' | 'USDC' | 'ETH' | 'BTC';
export type BlockchainNetwork = 'Polygon' | 'Ethereum' | 'Bitcoin';
export type FiatCurrency = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'ZAR' | 'KES' | 'GHS';
export type TxStatus = 'paid' | 'pending' | 'failed';
export type AppTheme = 'dark' | 'light' | 'system';
export type AppTab = 'pos' | 'transactions' | 'subscription' | 'settings';
export type PlanType = 'free' | 'pro';
export type ReceiptTheme = 'gold' | 'neon' | 'emerald' | 'obsidian' | 'paper' | 'verse';

export interface SubscriptionRecord {
  id: string;
  plan: PlanType;
  amountUsd: number;
  cryptoAsset: CryptoAsset;
  cryptoAmount: number;
  cryptoRateUsd: number;
  txHash: string;
  network: BlockchainNetwork;
  timestamp: number;
  formattedDate: string;
  formattedTime: string;
  status: 'confirmed' | 'pending' | 'failed';
  senderWallet: string;
  receivingWallet: string;
  periodStartTimestamp: number;
  periodEndTimestamp: number;
}

export interface SubscriptionState {
  plan: PlanType;
  proExpiresAt: number | null; // Timestamp when Pro expires (30 days from confirmation)
  currentPeriodStart: number; // Timestamp when current 30-day billing cycle started
  history: SubscriptionRecord[];
}

export interface CryptoAssetConfig {
  symbol: CryptoAsset;
  name: string;
  network: BlockchainNetwork;
  networkFamily: 'evm' | 'bitcoin';
  decimals: number;
  contractAddress?: string; // For ERC20 tokens
  coingeckoId: string;
  iconColor: string;
  badge: string;
}

export interface FiatCurrencyConfig {
  code: FiatCurrency;
  symbol: string;
  name: string;
  locale: string;
}

export interface TransactionRecord {
  id: string;
  reference: string;
  amountFiat: number;
  fiatCurrency: FiatCurrency;
  amountCrypto: number;
  cryptoAsset: CryptoAsset;
  network: BlockchainNetwork;
  cryptoRate: number; // Fiat per 1 crypto unit at time of charge
  merchantWallet: string;
  customerWallet?: string;
  txHash?: string;
  status: TxStatus;
  timestamp: number;
  formattedDate: string;
  formattedTime: string;
  blockNumber?: number;
  errorMessage?: string;
}

export interface WalletState {
  evmAddress: string | null;
  btcAddress: string | null;
  evmChainId: number | null;
  isConnected: boolean;
  walletProvider: string | null; // e.g. 'MetaMask', 'WalletConnect', 'Coinbase', 'Injected', 'Bitcoin'
}

export interface AssetBalance {
  symbol: CryptoAsset;
  balance: string; // Real string formatted
  balanceRaw: number;
  usdValue?: number;
  isLoading: boolean;
  error?: string | null;
}

export interface AppSettings {
  fiatCurrency: FiatCurrency;
  theme: AppTheme;
  language: string;
  biometricEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  merchantName: string;
  merchantLocation: string;
  customBtcReceivingAddress: string;
  customEvmReceivingAddress: string;
  receiptTheme?: ReceiptTheme;
  customReceiptNote?: string;
  receiptBadge?: string;
}
