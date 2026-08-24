import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CryptoAsset,
  FiatCurrency,
  TransactionRecord,
  WalletState,
  AssetBalance,
  AppSettings,
  AppTab,
} from '../types/merchant';
import {
  SUPPORTED_ASSETS,
  ASSET_ORDER,
  DEFAULT_SETTINGS,
  WALLETCONNECT_PROJECT_ID,
} from '../config/constants';
import {
  fetchRealAssetBalance,
  fetchLiveCryptoRates,
} from '../services/blockchainService';

interface MerchantContextType {
  // Navigation & View
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  isLoadingApp: boolean;
  setIsLoadingApp: (loading: boolean) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Selected Asset & Conversion
  selectedAsset: CryptoAsset;
  setSelectedAsset: (asset: CryptoAsset) => void;
  rates: {
    cryptoUsd: Record<CryptoAsset, number>;
    fiatPerUsd: number;
    cryptoInFiat: Record<CryptoAsset, number>;
  };
  refreshRates: () => Promise<void>;

  // Wallet
  wallet: WalletState;
  connectEvmWallet: (providerType?: string) => Promise<boolean>;
  connectBtcWallet: (address?: string) => Promise<boolean>;
  disconnectWallet: () => void;
  balances: Record<CryptoAsset, AssetBalance>;
  refreshBalances: () => Promise<void>;

  // Transactions
  transactions: TransactionRecord[];
  addTransaction: (tx: TransactionRecord) => void;
  updateTransaction: (id: string, updates: Partial<TransactionRecord>) => void;
  clearTransactions: () => void;
  exportTransactions: (format: 'csv' | 'json') => void;

  // Active Charge & Receipt State
  activeCharge: TransactionRecord | null;
  setActiveCharge: (charge: TransactionRecord | null) => void;
  activeReceipt: TransactionRecord | null;
  setActiveReceipt: (receipt: TransactionRecord | null) => void;

  // Biometric Auth
  isAppLocked: boolean;
  unlockApp: () => void;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

const LOCAL_STORAGE_SETTINGS = 'merchant_x_settings_v1';
const LOCAL_STORAGE_TXS = 'merchant_x_transactions_v1';
const LOCAL_STORAGE_WALLET = 'merchant_x_wallet_v1';

export const MerchantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentTab, setCurrentTab] = useState<AppTab>('pos');
  const [isLoadingApp, setIsLoadingApp] = useState<boolean>(true);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Selected Asset
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('VERSE');

  // Live Exchange Rates
  const [rates, setRates] = useState<{
    cryptoUsd: Record<CryptoAsset, number>;
    fiatPerUsd: number;
    cryptoInFiat: Record<CryptoAsset, number>;
  }>({
    cryptoUsd: { BTC: 64500, ETH: 3150, USDT: 1.0, POL: 0.42, VERSE: 0.000185 },
    fiatPerUsd: 1560,
    cryptoInFiat: { BTC: 100620000, ETH: 4914000, USDT: 1560, POL: 655.2, VERSE: 0.2886 },
  });

  // Wallet
  const [wallet, setWallet] = useState<WalletState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WALLET);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse wallet', e);
    }
    return {
      evmAddress: null,
      btcAddress: null,
      evmChainId: null,
      isConnected: false,
      walletProvider: null,
    };
  });

  // Balances
  const [balances, setBalances] = useState<Record<CryptoAsset, AssetBalance>>({
    VERSE: { symbol: 'VERSE', balance: '0', balanceRaw: 0, isLoading: false, error: null },
    POL: { symbol: 'POL', balance: '0', balanceRaw: 0, isLoading: false, error: null },
    USDT: { symbol: 'USDT', balance: '0', balanceRaw: 0, isLoading: false, error: null },
    ETH: { symbol: 'ETH', balance: '0', balanceRaw: 0, isLoading: false, error: null },
    BTC: { symbol: 'BTC', balance: '0', balanceRaw: 0, isLoading: false, error: null },
  });

  // Transactions
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse transactions', e);
    }
    return [];
  });

  // Active Checkout & Receipt Modals
  const [activeCharge, setActiveCharge] = useState<TransactionRecord | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<TransactionRecord | null>(null);

  // Apply Theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      // System
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }, [settings.theme]);

  // Save Settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(updated));
      } catch (e) {
        console.error('Save settings error', e);
      }
      return updated;
    });
  }, []);

  // Save Transactions
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TXS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Save transactions error', e);
    }
  }, [transactions]);

  // Save Wallet
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WALLET, JSON.stringify(wallet));
    } catch (e) {
      console.error('Save wallet error', e);
    }
  }, [wallet]);

  // Fetch Exchange Rates
  const refreshRates = useCallback(async () => {
    try {
      const live = await fetchLiveCryptoRates(settings.fiatCurrency);
      setRates(live);
    } catch (err) {
      console.error('Rates fetch error:', err);
    }
  }, [settings.fiatCurrency]);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 45000);
    return () => clearInterval(interval);
  }, [refreshRates]);

  // Fetch Real Balances
  const refreshBalances = useCallback(async () => {
    const effectiveEvm = wallet.evmAddress || settings.customEvmReceivingAddress;
    const effectiveBtc = wallet.btcAddress || settings.customBtcReceivingAddress;

    // Set loading
    setBalances((prev) => {
      const next = { ...prev };
      ASSET_ORDER.forEach((asset) => {
        next[asset] = { ...next[asset], isLoading: true, error: null };
      });
      return next;
    });

    const updatedBalances: Record<CryptoAsset, AssetBalance> = { ...balances };

    await Promise.all(
      ASSET_ORDER.map(async (asset) => {
        const config = SUPPORTED_ASSETS[asset];
        const targetAddress = config.networkFamily === 'bitcoin' ? effectiveBtc : effectiveEvm;

        if (!targetAddress) {
          updatedBalances[asset] = {
            symbol: asset,
            balance: '0',
            balanceRaw: 0,
            isLoading: false,
            error: null,
          };
          return;
        }

        const res = await fetchRealAssetBalance(asset, targetAddress);
        updatedBalances[asset] = {
          symbol: asset,
          balance: res.balance,
          balanceRaw: res.balanceRaw,
          isLoading: false,
          error: res.error,
        };
      })
    );

    setBalances(updatedBalances);
  }, [wallet.evmAddress, wallet.btcAddress, settings.customEvmReceivingAddress, settings.customBtcReceivingAddress]);

  useEffect(() => {
    refreshBalances();
  }, [wallet.evmAddress, wallet.btcAddress, settings.customEvmReceivingAddress, settings.customBtcReceivingAddress]);

  // Connect EVM Wallet
  const connectEvmWallet = useCallback(async (providerType: string = 'Injected') => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        const chainIdHex = await eth.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);

        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          setWallet((prev) => ({
            ...prev,
            evmAddress: address,
            evmChainId: chainId,
            isConnected: true,
            walletProvider: providerType || 'Browser Wallet',
          }));
          return true;
        }
      } else {
        // Fallback to WalletConnect / Web3Modal URI or manual address entry
        console.log('No injected ethereum provider found, using WalletConnect / Terminal Config');
      }
      return false;
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      throw err;
    }
  }, []);

  // Connect Bitcoin Wallet
  const connectBtcWallet = useCallback(async (customAddress?: string) => {
    try {
      if (customAddress && customAddress.trim()) {
        const addr = customAddress.trim();
        setWallet((prev) => ({
          ...prev,
          btcAddress: addr,
          isConnected: true,
          walletProvider: prev.walletProvider ? `${prev.walletProvider} + Bitcoin` : 'Bitcoin Address',
        }));
        return true;
      }

      // Check for browser Bitcoin wallets (Xverse, Unisat, Leather)
      if (typeof window !== 'undefined') {
        const win = window as any;
        if (win.unisat) {
          const accounts = await win.unisat.requestAccounts();
          if (accounts && accounts[0]) {
            setWallet((prev) => ({
              ...prev,
              btcAddress: accounts[0],
              isConnected: true,
              walletProvider: 'UniSat Bitcoin',
            }));
            return true;
          }
        } else if (win.BitcoinProvider) {
          const res = await win.BitcoinProvider.request('getAccounts');
          if (res && res[0]) {
            setWallet((prev) => ({
              ...prev,
              btcAddress: res[0],
              isConnected: true,
              walletProvider: 'Bitcoin Wallet',
            }));
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      console.error('Bitcoin wallet connection error:', err);
      return false;
    }
  }, []);

  // Disconnect Wallet
  const disconnectWallet = useCallback(() => {
    setWallet({
      evmAddress: null,
      btcAddress: null,
      evmChainId: null,
      isConnected: false,
      walletProvider: null,
    });
  }, []);

  // Transaction Management
  const addTransaction = useCallback((tx: TransactionRecord) => {
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<TransactionRecord>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const exportTransactions = useCallback((format: 'csv' | 'json') => {
    if (transactions.length === 0) return;

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `merchant_x_transactions_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ['ID', 'Reference', 'Amount Fiat', 'Currency', 'Amount Crypto', 'Asset', 'Network', 'Status', 'Date', 'Time', 'Merchant Wallet', 'Tx Hash'];
      const rows = transactions.map((t) => [
        t.id,
        t.reference,
        t.amountFiat,
        t.fiatCurrency,
        t.amountCrypto,
        t.cryptoAsset,
        t.network,
        t.status,
        t.formattedDate,
        t.formattedTime,
        `"${t.merchantWallet}"`,
        `"${t.txHash || ''}"`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `merchant_x_transactions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }, [transactions]);

  const unlockApp = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  return (
    <MerchantContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        isLoadingApp,
        setIsLoadingApp,
        settings,
        updateSettings,
        selectedAsset,
        setSelectedAsset,
        rates,
        refreshRates,
        wallet,
        connectEvmWallet,
        connectBtcWallet,
        disconnectWallet,
        balances,
        refreshBalances,
        transactions,
        addTransaction,
        updateTransaction,
        clearTransactions,
        exportTransactions,
        activeCharge,
        setActiveCharge,
        activeReceipt,
        setActiveReceipt,
        isAppLocked,
        unlockApp,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
};

export const useMerchant = () => {
  const context = useContext(MerchantContext);
  if (!context) {
    throw new Error('useMerchant must be used within a MerchantProvider');
  }
  return context;
};
