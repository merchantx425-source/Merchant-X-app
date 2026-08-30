import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppTab,
  CryptoAsset,
  AssetBalance,
  TransactionRecord,
  AppSettings,
  WalletState,
  SubscriptionState,
  SubscriptionRecord,
} from './types/merchant';
import {
  SUPPORTED_ASSETS,
  DEFAULT_SETTINGS,
  ASSET_ORDER,
  FREE_MONTHLY_LIMIT,
  PRO_SUBSCRIPTION_MS,
} from './config/constants';
import {
  fetchLiveCryptoRates,
  fetchRealAssetBalance,
} from './services/blockchainService';
import { exportTransactionsToPdf } from './services/pdfExportService';
import { disconnectWalletKit, onAppKitAccountChange } from './config/appkit';
import { LoadingScreen } from './components/LoadingScreen';
import { NotificationBar } from './components/NotificationBar';
import { POS } from './components/POS';
import { TransactionHistory } from './components/TransactionHistory';
import { Subscription } from './components/Subscription';
import { Settings } from './components/Settings';
import { Navbar } from './components/Navbar';
import { WalletModal } from './components/WalletModal';
import { ChargeFlowModal } from './components/ChargeFlowModal';
import { ReceiptModal } from './components/ReceiptModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { BiometricModal } from './components/BiometricModal';
import { VideoTutorialModal } from './components/Tutorial/VideoTutorialModal';
import {
  isBiometricEnabledState,
  hasStoredTerminalPin,
} from './services/biometricService';

const STORAGE_KEYS = {
  SETTINGS: 'merchant_x_settings_v1',
  WALLETS: 'merchant_x_wallets_v1',
  TRANSACTIONS: 'merchant_x_txs_v1',
  SUBSCRIPTION: 'merchant_x_subscription_v1',
};

export default function App() {
  // 1. Initial Loading Animation State
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [showVideoTutorial, setShowVideoTutorial] = useState(false);

  // Terminal Lock Screen State for Biometrics & PIN:
  // - ONLY if biometric authentication is on, it locks on reload (shows fingerprint)
  // - ONLY if pin is set, it locks on reload (shows pin)
  // - If neither is set, does NOT show after reload
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() => {
    return isBiometricEnabledState() || hasStoredTerminalPin();
  });

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

  // 6. Subscription State (Free vs Pro)
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (saved) {
        const parsed: SubscriptionState = JSON.parse(saved);
        const now = Date.now();
        // Check if pro has expired
        if (parsed.plan === 'pro' && parsed.proExpiresAt && parsed.proExpiresAt <= now) {
          parsed.plan = 'free';
        }
        // Auto reset month if period expired
        if (!parsed.currentPeriodStart || now - parsed.currentPeriodStart > PRO_SUBSCRIPTION_MS) {
          parsed.currentPeriodStart = now;
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
    return {
      plan: 'free',
      proExpiresAt: null,
      currentPeriodStart: Date.now(),
      history: [],
    };
  });

  // Periodically audit subscription expiry and monthly cycle resets
  useEffect(() => {
    const checkSubscriptionCycle = () => {
      setSubscriptionState((prev) => {
        const now = Date.now();
        let modified = false;
        let nextPlan = prev.plan;
        let nextPeriodStart = prev.currentPeriodStart;

        // 1. Pro expiry check
        if (prev.plan === 'pro' && prev.proExpiresAt && prev.proExpiresAt <= now) {
          nextPlan = 'free';
          modified = true;
        }

        // 2. 30-day monthly period auto-reset
        if (!nextPeriodStart || now - nextPeriodStart > PRO_SUBSCRIPTION_MS) {
          nextPeriodStart = now;
          modified = true;
        }

        if (modified) {
          const updated: SubscriptionState = {
            ...prev,
            plan: nextPlan,
            currentPeriodStart: nextPeriodStart,
          };
          try {
            localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
          } catch {
            // Ignore
          }
          return updated;
        }
        return prev;
      });
    };

    checkSubscriptionCycle();
    const interval = setInterval(checkSubscriptionCycle, 60000); // Audit every 60s
    return () => clearInterval(interval);
  }, []);

  // 7. POS Keypad & Asset State
  const [amountInput, setAmountInput] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset>('VERSE');

  // 8. Live Rates State
  const [cryptoInFiatRates, setCryptoInFiatRates] = useState<Record<CryptoAsset, number>>({
    BTC: 102000000,
    ETH: 4980000,
    USDT: 1580,
    USDC: 1580,
    POL: 660,
    VERSE: 0.02844,
  });
  const [cryptoRatesUsd, setCryptoRatesUsd] = useState<Record<CryptoAsset, number>>({
    BTC: 96000,
    ETH: 3100,
    USDT: 1,
    USDC: 1,
    POL: 0.42,
    VERSE: 0.000018,
  });
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastRatesUpdated, setLastRatesUpdated] = useState<number>(Date.now());

  // 9. Balances State
  const [balances, setBalances] = useState<Record<CryptoAsset, AssetBalance>>({
    VERSE: { symbol: 'VERSE', balance: '0', balanceRaw: 0, isLoading: false },
    POL: { symbol: 'POL', balance: '0', balanceRaw: 0, isLoading: false },
    USDC: { symbol: 'USDC', balance: '0', balanceRaw: 0, isLoading: false },
    USDT: { symbol: 'USDT', balance: '0', balanceRaw: 0, isLoading: false },
    ETH: { symbol: 'ETH', balance: '0', balanceRaw: 0, isLoading: false },
    BTC: { symbol: 'BTC', balance: '0', balanceRaw: 0, isLoading: false },
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);

  // 10. Modals State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [activeReceiptTx, setActiveReceiptTx] = useState<TransactionRecord | null>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);

  // Derive Pro status & Transaction Usage
  const isPro = useMemo(() => {
    return (
      subscriptionState.plan === 'pro' &&
      !!subscriptionState.proExpiresAt &&
      subscriptionState.proExpiresAt > Date.now()
    );
  }, [subscriptionState]);

  const successfulTxThisPeriod = useMemo(() => {
    const periodStart = subscriptionState.currentPeriodStart || Date.now() - PRO_SUBSCRIPTION_MS;
    return transactions.filter(
      (tx) => tx.status === 'paid' && tx.timestamp >= periodStart
    ).length;
  }, [transactions, subscriptionState.currentPeriodStart]);

  const freeTransactionsRemaining = useMemo(() => {
    if (isPro) return Infinity;
    return Math.max(0, FREE_MONTHLY_LIMIT - successfulTxThisPeriod);
  }, [isPro, successfulTxThisPeriod]);

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

  // Fetch Live Rates
  const refreshRates = useCallback(async () => {
    try {
      setRatesError(null);
      const rates = await fetchLiveCryptoRates(settings.fiatCurrency);
      setCryptoInFiatRates(rates.cryptoInFiat);
      if (rates.cryptoUsd) {
        setCryptoRatesUsd(rates.cryptoUsd);
      }
      setLastRatesUpdated(Date.now());
    } catch (err: any) {
      console.warn('Rates refresh notice:', err);
      setRatesError('Unable to load current price');
    }
  }, [settings.fiatCurrency]);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 25000); // 25s auto-refresh
    return () => clearInterval(interval);
  }, [refreshRates]);

  // Fetch Real On-Chain Balances for all 6 assets immediately
  const refreshBalances = useCallback(async () => {
    setIsRefreshingBalances(true);

    // Set loading state for all assets
    setBalances((prev) => {
      const next = { ...prev };
      ASSET_ORDER.forEach((sym) => {
        next[sym] = {
          ...(next[sym] || { symbol: sym, balance: '0', balanceRaw: 0 }),
          isLoading: true,
          error: null,
        };
      });
      return next;
    });

    const activeEvm = walletState.evmAddress || settings.customEvmReceivingAddress || null;
    const activeBtc = walletState.btcAddress || settings.customBtcReceivingAddress || null;

    try {
      const results = await Promise.all(
        ASSET_ORDER.map(async (symbol) => {
          const config = SUPPORTED_ASSETS[symbol];
          const targetAddress = config.networkFamily === 'bitcoin' ? activeBtc : activeEvm;

          if (targetAddress) {
            try {
              const res = await fetchRealAssetBalance(symbol, targetAddress);
              return { symbol, res };
            } catch (err: any) {
              console.warn(`Balance fetch warning for ${symbol}:`, err);
              return {
                symbol,
                res: {
                  balance: 'Unable to load balance',
                  balanceRaw: 0,
                  error: 'Unable to load balance',
                },
              };
            }
          } else {
            return { symbol, res: { balance: '0', balanceRaw: 0, error: null } };
          }
        })
      );

      const updatedBalances: Record<CryptoAsset, AssetBalance> = {
        VERSE: { symbol: 'VERSE', balance: '0', balanceRaw: 0, isLoading: false, error: null },
        POL: { symbol: 'POL', balance: '0', balanceRaw: 0, isLoading: false, error: null },
        USDT: { symbol: 'USDT', balance: '0', balanceRaw: 0, isLoading: false, error: null },
        USDC: { symbol: 'USDC', balance: '0', balanceRaw: 0, isLoading: false, error: null },
        ETH: { symbol: 'ETH', balance: '0', balanceRaw: 0, isLoading: false, error: null },
        BTC: { symbol: 'BTC', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      };

      results.forEach(({ symbol, res }) => {
        updatedBalances[symbol] = {
          symbol,
          balance: res.balance,
          balanceRaw: res.balanceRaw,
          isLoading: false,
          error: res.error,
        };
      });

      setBalances(updatedBalances);
    } finally {
      setIsRefreshingBalances(false);
    }
  }, [
    walletState.evmAddress,
    walletState.btcAddress,
    settings.customBtcReceivingAddress,
    settings.customEvmReceivingAddress,
  ]);

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
          } catch {
            // Ignore
          }
          return updated;
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Update Balances whenever wallets or custom receiving addresses change, with 30s background sync
  useEffect(() => {
    refreshBalances();
    const interval = setInterval(() => {
      if (walletState.isConnected || settings.customEvmReceivingAddress || settings.customBtcReceivingAddress) {
        refreshBalances();
      }
    }, 35000);
    return () => clearInterval(interval);
  }, [
    refreshBalances,
    walletState.isConnected,
    settings.customEvmReceivingAddress,
    settings.customBtcReceivingAddress,
  ]);

  // Save Settings Changes
  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Connect Wallet Action
  const handleConnectWallet = (
    evmAddr: string | null,
    btcAddr: string | null,
    provider: string
  ) => {
    const newState: WalletState = {
      evmAddress: evmAddr,
      btcAddress: btcAddr,
      evmChainId: evmAddr ? 137 : null, // Default Polygon
      isConnected: !!(evmAddr || btcAddr),
      walletProvider: provider,
    };
    setWalletState(newState);
    try {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(newState));
    } catch {
      // Ignore
    }
    setTimeout(() => {
      refreshBalances();
    }, 50);
  };

  // Disconnect Wallet Action
  const handleDisconnectWallet = async () => {
    await disconnectWalletKit();
    const emptyState: WalletState = {
      evmAddress: null,
      btcAddress: null,
      evmChainId: null,
      isConnected: false,
      walletProvider: null,
    };
    setWalletState(emptyState);
    setBalances({
      VERSE: { symbol: 'VERSE', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      POL: { symbol: 'POL', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      USDT: { symbol: 'USDT', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      USDC: { symbol: 'USDC', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      ETH: { symbol: 'ETH', balance: '0', balanceRaw: 0, isLoading: false, error: null },
      BTC: { symbol: 'BTC', balance: '0', balanceRaw: 0, isLoading: false, error: null },
    });
    try {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(emptyState));
    } catch {
      // Ignore
    }
  };

  // Keypad Actions
  const handleDigitPress = (digit: string) => {
    setAmountInput((prev) => {
      if (digit === '.') {
        if (prev.includes('.')) return prev;
        if (prev === '') return '0.';
        return prev + '.';
      }

      if (prev === '0' && digit !== '.') {
        return digit;
      }

      // Check decimal digits limit (max 2 decimal places)
      if (prev.includes('.')) {
        const [, decimalPart] = prev.split('.');
        if (decimalPart && decimalPart.length >= 2) {
          return prev;
        }
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
    // Check Free Plan Transaction Limits
    if (!isPro && freeTransactionsRemaining <= 0) {
      setActiveTab('subscription');
      return;
    }

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

  // Delete Single Transaction Handler
  const handleDeleteTransaction = (txId: string) => {
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== txId);
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Clear All Transactions Handler
  const handleClearAllTransactions = () => {
    setTransactions([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    } catch {
      // Ignore
    }
  };

  // Export Transactions helper for Settings screen (Official PDF Statement)
  const handleExportTransactions = () => {
    if (transactions.length === 0) return;
    exportTransactionsToPdf(transactions, settings);
  };

  // Subscription Success Callback (Unlocks Pro for exactly 30 days)
  const handleSubscriptionSuccess = (record: SubscriptionRecord) => {
    const now = Date.now();
    const updated: SubscriptionState = {
      plan: 'pro',
      proExpiresAt: now + PRO_SUBSCRIPTION_MS,
      currentPeriodStart: now,
      history: [record, ...(subscriptionState.history || [])],
    };
    setSubscriptionState(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
    } catch {
      // Ignore
    }
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
        <LoadingScreen
          onComplete={() => {
            setIsLoadingApp(false);
            setShowVideoTutorial(true);
          }}
        />
      )}

      {/* 2. Top Notification Bar */}
      <NotificationBar
        walletState={walletState}
        selectedAsset={selectedAsset}
        ratesError={ratesError}
        onRefreshRates={refreshRates}
        isRefreshingBalances={isRefreshingBalances}
        biometricEnabled={settings.biometricEnabled}
        onLockTerminal={() => setIsTerminalLocked(true)}
      />

      {/* 3. Main Terminal Screen Container */}
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
            isPro={isPro}
            freeTransactionsRemaining={freeTransactionsRemaining}
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistory
            transactions={transactions}
            onSelectReceipt={(tx) => setActiveReceiptTx(tx)}
            onClearHistory={handleClearAllTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            language={settings.language}
            settings={settings}
            isPro={isPro}
            onUpgradePro={() => setActiveTab('subscription')}
          />
        )}

        {activeTab === 'subscription' && (
          <Subscription
            subscriptionState={subscriptionState}
            transactions={transactions}
            walletState={walletState}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
            cryptoRatesUsd={cryptoRatesUsd}
            onSubscriptionSuccess={handleSubscriptionSuccess}
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
            onOpenSubscription={() => setActiveTab('subscription')}
            subscriptionState={subscriptionState}
            isPro={isPro}
            onOpenInstallPrompt={() => setShowPwaInstallModal(true)}
            onLockTerminal={() => setIsTerminalLocked(true)}
          />
        )}
      </main>

      {/* 4. Bottom Mobile Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        language={settings.language}
        isPro={isPro}
      />

      {/* 5. Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletState={walletState}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        balances={balances}
        onRefreshBalances={refreshBalances}
        isRefreshingBalances={isRefreshingBalances}
        cryptoInFiatRates={cryptoInFiatRates}
        fiatCurrency={settings.fiatCurrency}
      />

      {/* 6. Charge Flow & Blockchain Verification Modal */}
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

      {/* 7. Merchant X Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptTx}
        onClose={() => setActiveReceiptTx(null)}
        transaction={activeReceiptTx}
        merchantName={settings.merchantName}
        merchantLocation={settings.merchantLocation}
        language={settings.language}
        onNewPayment={handleNewPayment}
        isPro={isPro}
        activeReceiptTheme={settings.receiptTheme || 'gold'}
        onSelectReceiptTheme={(theme) => handleUpdateSettings({ receiptTheme: theme })}
        customReceiptNote={settings.customReceiptNote}
      />

      {/* 8. PWA Install Modal / Floating Prompt */}
      <PWAInstallPrompt
        forceOpen={showPwaInstallModal}
        onClose={() => setShowPwaInstallModal(false)}
      />

      {/* 9. Biometric / PIN Terminal Lock Screen */}
      <BiometricModal
        isOpen={isTerminalLocked}
        isLockScreen={true}
        onSuccess={() => setIsTerminalLocked(false)}
      />

      {/* 10. Startup / Help Video Tutorial Modal */}
      <VideoTutorialModal
        isOpen={showVideoTutorial}
        onClose={() => setShowVideoTutorial(false)}
      />
    </div>
  );
}
