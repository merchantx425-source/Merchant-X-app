/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CryptoAsset,
  TransactionRecord,
  WalletState,
  AssetBalance,
  AppSettings,
  AppTab,
} from './types/merchant';
import { SUPPORTED_ASSETS, DEFAULT_SETTINGS, ASSET_ORDER } from './config/constants';
import {
  fetchLiveCryptoRates,
  fetchRealAssetBalance,
} from './services/blockchainService';
import { disconnectWalletKit, onAppKitAccountChange } from './config/appkit';
import { LoadingScreen } from './components/LoadingScreen';
import { POS } from './components/POS';
import { TransactionHistory } from './components/TransactionHistory';
import { Settings } from './components/Settings';
import { Navbar } from './components/Navbar';
import { WalletModal } from './components/WalletModal';
import { ChargeFlowModal } from './components/ChargeFlowModal';
import { ReceiptModal } from './components/ReceiptModal';

const STORAGE_KEYS = {
  SETTINGS: 'merchant_x_settings_v1',
  WALLETS: 'merchant_x_wallets_v1',
  TRANSACTIONS: 'merchant_x_txs_v1',
};

export default function App() {
  // 1. Initial Loading Animation State
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  // 2. Active Screen Tab
  const [activeTab, setActiveTab] = useState<AppTab>('pos');

  // 3. Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // 4. Wallet State
  const [walletState, setWalletState] = useState<WalletState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WALLETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          evmAddress: parsed.evmAddress || null,
          btcAddress: parsed.btcAddress || null,
          evmChainId: parsed.evmChainId || null,
          isConnected: !!(parsed.evmAddress || parsed.btcAddress),
          walletProvider: parsed.walletProvider || null,
        };
      }
    } catch {
      // Fallback
    }
    return {
      evmAddress: null,
      btcAddress: null,
      evmChainId: null,
      isConnected: false,
      walletProvider: null,
    };
  });

  // 5. Transactions History State
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // 6. POS Keypad & Asset State
  const [amountInput, setAmountInput] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('BTC');

  // 7. Live Rates & Balances State
  const [cryptoInFiatRates, setCryptoInFiatRates] = useState<Record<CryptoAsset, number>>({
    BTC: 145000000,
    ETH: 4850000,
    USDT: 1560,
    POL: 650,
    VERSE: 0.28,
  });
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastRatesUpdated, setLastRatesUpdated] = useState<number>(Date.now());

  const [balances, setBalances] = useState<Record<CryptoAsset, AssetBalance>>({
    VERSE: { symbol: 'VERSE', balance: '0', balanceRaw: 0, isLoading: false },
    POL: { symbol: 'POL', balance: '0', balanceRaw: 0, isLoading: false },
    USDT: { symbol: 'USDT', balance: '0', balanceRaw: 0, isLoading: false },
    ETH: { symbol: 'ETH', balance: '0', balanceRaw: 0, isLoading: false },
    BTC: { symbol: 'BTC', balance: '0', balanceRaw: 0, isLoading: false },
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // 8. Modals State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [activeReceiptTx, setActiveReceiptTx] = useState<TransactionRecord | null>(null);

  // Apply Theme class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (settings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // System
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Listen for real-time AppKit / WalletConnect account changes
  useEffect(() => {
    const unsubscribe = onAppKitAccountChange((account) => {
      if (account.isConnected && account.address) {
        const isBtc = !account.address.startsWith('0x');
        setWalletState((prev) => {
          const updated: WalletState = {
            ...prev,
            evmAddress: isBtc ? prev.evmAddress : account.address,
            btcAddress: isBtc ? account.address : prev.btcAddress,
            isConnected: true,
            walletProvider: 'AppKit Web3 Wallet',
          };
          try {
            localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Persist Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save settings to localStorage:', err);
      }
      return updated;
    });
  };

  // Persist Wallets
  const handleConnectWallet = (
    evmAddress: string | null,
    btcAddress: string | null,
    providerName: string
  ) => {
    const updated: WalletState = {
      evmAddress,
      btcAddress,
      evmChainId: 137,
      isConnected: !!(evmAddress || btcAddress),
      walletProvider: providerName,
    };
    setWalletState(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWalletKit();
    } catch {
      // Ignore
    }
    const updated: WalletState = {
      evmAddress: null,
      btcAddress: null,
      evmChainId: null,
      isConnected: false,
      walletProvider: null,
    };
    setWalletState(updated);
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLETS);
    } catch {
      // Ignore
    }
  };

  // Fetch Live Rates
  const refreshRates = useCallback(async () => {
    try {
      setRatesError(null);
      const rates = await fetchLiveCryptoRates(settings.fiatCurrency);
      setCryptoInFiatRates(rates.cryptoInFiat);
      setLastRatesUpdated(Date.now());
    } catch (err: any) {
      console.warn('Rates refresh failed:', err);
      setRatesError('Unable to load current price');
    }
  }, [settings.fiatCurrency]);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [refreshRates]);

  // Fetch Real On-Chain Balances
  const refreshBalances = useCallback(async () => {
    setIsRefreshingBalances(true);

    const updatedBalances = { ...balances };
    for (const symbol of ASSET_ORDER) {
      const config = SUPPORTED_ASSETS[symbol];
      const address =
        config.networkFamily === 'bitcoin'
          ? walletState.btcAddress || settings.customBtcReceivingAddress
          : walletState.evmAddress || settings.customEvmReceivingAddress;

      updatedBalances[symbol] = {
        ...updatedBalances[symbol],
        isLoading: true,
      };
      setBalances({ ...updatedBalances });

      if (address) {
        const res = await fetchRealAssetBalance(symbol, address);
        updatedBalances[symbol] = {
          symbol,
          balance: res.balance,
          balanceRaw: res.balanceRaw,
          isLoading: false,
          error: res.error,
        };
      } else {
        updatedBalances[symbol] = {
          symbol,
          balance: '0',
          balanceRaw: 0,
          isLoading: false,
          error: null,
        };
      }
    }

    setBalances(updatedBalances);
    setIsRefreshingBalances(false);
  }, [
    walletState.evmAddress,
    walletState.btcAddress,
    settings.customBtcReceivingAddress,
    settings.customEvmReceivingAddress,
  ]);

  useEffect(() => {
    refreshBalances();
  }, [
    walletState.evmAddress,
    walletState.btcAddress,
    settings.customBtcReceivingAddress,
    settings.customEvmReceivingAddress,
  ]);

  // Keypad Handlers
  const handleDigitPress = (digit: string) => {
    setAmountInput((prev) => {
      // Decimal point validation
      if (digit === '.') {
        if (prev.includes('.')) return prev;
        if (prev === '') return '0.';
        return prev + '.';
      }

      // Max 2 decimal digits
      if (prev.includes('.')) {
        const [, decimals] = prev.split('.');
        if (decimals && decimals.length >= 2) return prev;
      }

      // Prevent leading double zeros
      if (prev === '0' && digit !== '.') {
        return digit;
      }

      // Prevent unrealistically long inputs
      if (prev.replace('.', '').length >= 10) {
        return prev;
      }

      return prev + digit;
    });
  };

  const handleDeletePress = () => {
    setAmountInput((prev) => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleClearPress = () => {
    setAmountInput('');
  };

  // Charge Trigger
  const handleChargePress = () => {
    const config = SUPPORTED_ASSETS[selectedAsset];
    const merchantAddress =
      config.networkFamily === 'bitcoin'
        ? walletState.btcAddress || settings.customBtcReceivingAddress
        : walletState.evmAddress || settings.customEvmReceivingAddress;

    if (!merchantAddress) {
      // Prompt wallet connect first
      setIsWalletModalOpen(true);
      return;
    }

    const numAmount = parseFloat(amountInput || '0');
    if (numAmount <= 0) return;

    setIsChargeModalOpen(true);
  };

  // Payment Success Callback
  const handlePaymentSuccess = (newTx: TransactionRecord) => {
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // Reset amount input on terminal
    setAmountInput('');
    setIsChargeModalOpen(false);
    setActiveReceiptTx(newTx);
    refreshBalances();
  };

  // New Payment Handler for Receipt Modal
  const handleNewPayment = () => {
    setAmountInput('');
    setActiveReceiptTx(null);
    setIsChargeModalOpen(false);
    setActiveTab('pos');
  };

  // Export Transactions helper for Settings screen
  const handleExportTransactions = () => {
    if (transactions.length === 0) return;
    const headers = [
      'ID',
      'Reference',
      'Date',
      'Time',
      'Status',
      'Fiat Amount',
      'Currency',
      'Crypto Amount',
      'Asset',
      'Network',
      'Merchant Wallet',
      'Tx Hash',
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.reference,
      t.formattedDate,
      t.formattedTime,
      t.status,
      t.amountFiat,
      t.fiatCurrency,
      t.amountCrypto,
      t.cryptoAsset,
      t.network,
      t.merchantWallet,
      t.txHash || '',
    ]);
    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `merchant_x_transactions_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Current merchant receiving address for selected asset
  const currentSelectedMerchantWallet =
    SUPPORTED_ASSETS[selectedAsset].networkFamily === 'bitcoin'
      ? walletState.btcAddress ||
        settings.customBtcReceivingAddress ||
        'bc1qmerchantx0000000000000000000000000000'
      : walletState.evmAddress ||
        settings.customEvmReceivingAddress ||
        '0x0000000000000000000000000000000000000000';

  const numFiat = parseFloat(amountInput || '0') || 0;
  const cryptoRate = cryptoInFiatRates[selectedAsset] || 1;
  const numCrypto = cryptoRate > 0 ? numFiat / cryptoRate : 0;

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* 1. Loading Screen Animation */}
      {isLoadingApp && (
        <LoadingScreen onComplete={() => setIsLoadingApp(false)} />
      )}

      {/* 2. Main Terminal Screen Container */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col justify-center">
        {activeTab === 'pos' && (
          <POS
            amountInput={amountInput}
            onDigitPress={handleDigitPress}
            onDeletePress={handleDeletePress}
            onClearPress={handleClearPress}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            balances={balances}
            onRefreshBalances={refreshBalances}
            isRefreshingBalances={isRefreshingBalances}
            cryptoInFiatRates={cryptoInFiatRates}
            onCharge={handleChargePress}
            walletState={walletState}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
            onOpenSettings={() => setActiveTab('settings')}
            settings={settings}
            onRefreshRates={refreshRates}
            ratesError={ratesError}
            lastRatesUpdated={lastRatesUpdated}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistory
            transactions={transactions}
            onSelectReceipt={(tx) => setActiveReceiptTx(tx)}
            language={settings.language}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            walletState={walletState}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
            onDisconnectWallet={handleDisconnectWallet}
            onOpenHistory={() => setActiveTab('transactions')}
            onExportTransactions={handleExportTransactions}
          />
        )}
      </main>

      {/* 3. Bottom Mobile Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        language={settings.language}
      />

      {/* 4. Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletState={walletState}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
      />

      {/* 5. Charge Flow & Blockchain Verification Modal */}
      <ChargeFlowModal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        amountFiat={numFiat}
        fiatCurrency={settings.fiatCurrency}
        amountCrypto={numCrypto}
        cryptoAsset={selectedAsset}
        cryptoRate={cryptoRate}
        merchantWallet={currentSelectedMerchantWallet}
        onPaymentSuccess={handlePaymentSuccess}
        language={settings.language}
      />

      {/* 6. Merchant X Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptTx}
        onClose={() => setActiveReceiptTx(null)}
        transaction={activeReceiptTx}
        merchantName={settings.merchantName}
        merchantLocation={settings.merchantLocation}
        language={settings.language}
        onNewPayment={handleNewPayment}
      />
    </div>
  );
}
