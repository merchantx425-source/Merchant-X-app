import React, { useState, useMemo } from 'react';
import { WALLETCONNECT_PROJECT_ID, openWalletModal, disconnectWalletKit } from '../config/appkit';
import { WalletState, CryptoAsset, AssetBalance, FiatCurrency } from '../types/merchant';
import { SUPPORTED_ASSETS, ASSET_ORDER, SUPPORTED_FIAT } from '../config/constants';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import {
  calculateAssetFiatValue,
  calculateTotalPortfolioFiatValue,
  formatFiatAmount,
} from '../services/blockchainService';
import {
  X,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Lock,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { MerchantXLogo } from './MerchantXLogo';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  onConnectWallet: (evmAddress: string | null, btcAddress: string | null, providerName: string) => void;
  onDisconnectWallet: () => void;
  balances?: Record<CryptoAsset, AssetBalance>;
  onRefreshBalances?: () => void;
  isRefreshingBalances?: boolean;
  cryptoInFiatRates?: Record<CryptoAsset, number>;
  fiatCurrency?: FiatCurrency;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletState,
  onConnectWallet,
  onDisconnectWallet,
  balances,
  onRefreshBalances,
  isRefreshingBalances = false,
  cryptoInFiatRates,
  fiatCurrency = 'USD',
}) => {
  const [activeTab, setActiveTab] = useState<'appkit' | 'manual'>('appkit');
  const [manualEvm, setManualEvm] = useState(walletState.evmAddress || '');
  const [manualBtc, setManualBtc] = useState(walletState.btcAddress || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fiatConfig = SUPPORTED_FIAT[fiatCurrency] || SUPPORTED_FIAT.USD;

  // Calculate total portfolio fiat value using the same pricing engine
  const totalPortfolioValue = useMemo(() => {
    if (!balances || !cryptoInFiatRates) return 0;
    return calculateTotalPortfolioFiatValue(balances, cryptoInFiatRates);
  }, [balances, cryptoInFiatRates]);

  if (!isOpen) return null;

  // Open Safe Official Reown AppKit / WalletConnect Modal
  const handleOpenAppKit = async () => {
    setErrorMsg(null);
    try {
      const res = await openWalletModal();
      if (!res.success) {
        setErrorMsg(res.error || 'Wallet connection modal is currently unavailable. Please enter a settlement address manually.');
      }
    } catch (err: any) {
      console.error('AppKit modal open error:', err);
      setErrorMsg(err?.message || 'Failed to open AppKit wallet modal.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWalletKit();
    } catch (err) {
      console.warn('Disconnect error:', err);
    }
    onDisconnectWallet();
  };

  const handleSaveManualAddresses = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEvm = manualEvm.trim();
    const cleanBtc = manualBtc.trim();

    if (cleanEvm && !cleanEvm.startsWith('0x')) {
      setErrorMsg('Invalid EVM address: must start with 0x.');
      return;
    }
    if (cleanEvm && cleanEvm.length !== 42) {
      setErrorMsg('Invalid EVM address length (expected 42 characters).');
      return;
    }

    if (cleanBtc && cleanBtc.length < 26) {
      setErrorMsg('Invalid Bitcoin address format.');
      return;
    }

    if (!cleanEvm && !cleanBtc) {
      setErrorMsg('Please enter at least an EVM or Bitcoin receiving address.');
      return;
    }

    onConnectWallet(
      cleanEvm || walletState.evmAddress,
      cleanBtc || walletState.btcAddress,
      'Merchant Settlement Address'
    );
    onClose();
  };

  // Direct Connect Injected EVM Wallet (MetaMask, Coinbase, Rabby)
  const handleConnectInjectedEvm = async () => {
    setErrorMsg(null);
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          onConnectWallet(accounts[0], walletState.btcAddress, 'Browser Injected (MetaMask)');
          onClose();
          return;
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to connect EVM wallet.');
      }
    } else {
      setErrorMsg('No injected EVM browser extension detected. Please use AppKit modal.');
    }
  };

  // Direct Connect Injected Bitcoin Wallet (UniSat, Xverse, OKX)
  const handleConnectBitcoinExtension = async () => {
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      const unisat = (window as any).unisat;
      const okx = (window as any).okxwallet?.bitcoin;
      const btcProvider = (window as any).BitcoinProvider || (window as any).XverseProviders?.BitcoinProvider;

      try {
        if (unisat) {
          const accounts = await unisat.requestAccounts();
          if (accounts && accounts.length > 0) {
            onConnectWallet(walletState.evmAddress, accounts[0], 'UniSat Bitcoin Wallet');
            onClose();
            return;
          }
        } else if (okx) {
          const res = await okx.connect();
          if (res?.address) {
            onConnectWallet(walletState.evmAddress, res.address, 'OKX Bitcoin Wallet');
            onClose();
            return;
          }
        } else if (btcProvider) {
          const res = await btcProvider.connect();
          if (res?.address) {
            onConnectWallet(walletState.evmAddress, res.address, 'Bitcoin Wallet Provider');
            onClose();
            return;
          }
        } else {
          setActiveTab('manual');
          setErrorMsg('No Bitcoin browser extension detected. Enter your BTC receiving address below or scan via AppKit QR.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to connect Bitcoin wallet.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#13151b] border border-purple-900/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <MerchantXLogo size="sm" />
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white tracking-tight">Merchant Settlement Wallet</h2>
              <p className="text-[11px] text-zinc-400">Receive VERSE, POL, USDT, USDC, ETH, & BTC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto pr-0.5 space-y-3.5 py-2">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-[#0b0c10] p-1 rounded-xl border border-zinc-800/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('appkit'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'appkit'
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>AppKit Web3 Modal</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('manual'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Direct Receiving Address</span>
            </button>
          </div>

          {/* Status / Error feedback */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Content based on Tab */}
          {activeTab === 'appkit' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300">
                Connect with <span className="text-amber-400 font-semibold">Reown AppKit / WalletConnect</span> to link your EVM (Polygon/Ethereum) or Bitcoin wallet for non-custodial terminal settlement.
              </p>

              {/* Main Action Button to open AppKit */}
              <button
                type="button"
                onClick={handleOpenAppKit}
                className="w-full p-3.5 bg-gradient-to-r from-[#1c1f2b] to-[#161822] hover:from-[#242838] hover:to-[#1e202e] border border-amber-500/40 hover:border-amber-400 rounded-2xl transition-all group cursor-pointer shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300">
                      Open Official AppKit Modal
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      MetaMask, Trust, Coinbase, Rainbow, Unisat, Xverse, OKX, QR Code
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Quick 1-Click Connect for Injected Browser Extensions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConnectInjectedEvm}
                  className="p-2.5 bg-[#0e1017] hover:bg-[#161924] border border-purple-800/40 hover:border-purple-500/70 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/30 shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-white truncate">EVM Browser Wallet</div>
                    <div className="text-[9px] text-zinc-400 truncate">MetaMask / Rabby / Brave</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleConnectBitcoinExtension}
                  className="p-2.5 bg-[#0e1017] hover:bg-[#161924] border border-amber-800/40 hover:border-amber-500/70 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30 shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-white truncate">Bitcoin Wallet</div>
                    <div className="text-[9px] text-zinc-400 truncate">UniSat / Xverse / OKX</div>
                  </div>
                </button>
              </div>

              {/* Network Badges */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <div className="p-2 bg-[#0c0d12] rounded-xl border border-zinc-800 text-center">
                  <div className="text-[11px] font-bold text-purple-400">Polygon</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">VERSE, POL, USDT, USDC</div>
                </div>
                <div className="p-2 bg-[#0c0d12] rounded-xl border border-zinc-800 text-center">
                  <div className="text-[11px] font-bold text-blue-400">Ethereum</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">ETH Mainnet</div>
                </div>
                <div className="p-2 bg-[#0c0d12] rounded-xl border border-zinc-800 text-center">
                  <div className="text-[11px] font-bold text-amber-400">Bitcoin</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">BTC Mainnet</div>
                </div>
              </div>

              {/* Project ID info */}
              <div className="p-2 bg-[#0c0d12] rounded-xl border border-zinc-800/70 text-[10px] text-zinc-400 flex items-center justify-between">
                <span>WalletConnect Project ID:</span>
                <span className="font-mono text-zinc-500">{WALLETCONNECT_PROJECT_ID.slice(0, 10)}...</span>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleSaveManualAddresses} className="space-y-3">
              <p className="text-xs text-zinc-300">
                For merchant cold-storage hardware wallets or exchange deposit addresses:
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  EVM Settlement Address (Polygon / Ethereum)
                </label>
                <input
                  type="text"
                  value={manualEvm}
                  onChange={(e) => setManualEvm(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#0b0c10] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Settles VERSE, POL, USDT, USDC, and ETH.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Bitcoin Settlement Address (BTC)
                </label>
                <input
                  type="text"
                  value={manualBtc}
                  onChange={(e) => setManualBtc(e.target.value)}
                  placeholder="bc1q... or 1... or 3..."
                  className="w-full bg-[#0b0c10] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Settles native Bitcoin (BTC).</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 mt-1 cursor-pointer"
              >
                Save Terminal Settlement Addresses
              </button>
            </form>
          )}

          {/* Current status & Live On-Chain Balances if already connected */}
          {(walletState.evmAddress || walletState.btcAddress) && (
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Currently Active Terminal:</span>
                {onRefreshBalances && (
                  <button
                    type="button"
                    onClick={onRefreshBalances}
                    disabled={isRefreshingBalances}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingBalances ? 'animate-spin' : ''}`} />
                    <span>Sync Balances</span>
                  </button>
                )}
              </div>

              {walletState.evmAddress && (
                <div className="text-xs font-mono bg-zinc-900/90 p-2 rounded-xl text-amber-300 flex items-center justify-between border border-zinc-800">
                  <span className="truncate max-w-[280px]">EVM: {walletState.evmAddress.slice(0, 12)}...{walletState.evmAddress.slice(-6)}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              )}
              {walletState.btcAddress && (
                <div className="text-xs font-mono bg-zinc-900/90 p-2 rounded-xl text-amber-400 flex items-center justify-between border border-zinc-800">
                  <span className="truncate max-w-[280px]">BTC: {walletState.btcAddress.slice(0, 12)}...{walletState.btcAddress.slice(-6)}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              )}

              {/* Live On-Chain Balances Grid & Portfolio Value */}
              {balances && (
                <div className="mt-2 pt-2 border-t border-zinc-800/60 space-y-2">
                  {/* Total Portfolio Value Banner */}
                  <div className="p-2.5 bg-gradient-to-r from-amber-500/15 via-purple-900/20 to-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Total Portfolio Value</div>
                        <div className="text-xs sm:text-sm font-black font-mono text-amber-300">
                          {formatFiatAmount(totalPortfolioValue, fiatCurrency)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800">
                      Live Base USD
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between px-0.5">
                    <span>On-Chain Asset Balances</span>
                    <span className="text-[9px] text-zinc-500 font-normal">Real-time RPC</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ASSET_ORDER.map((sym) => {
                      const bData = balances[sym];
                      const rate = cryptoInFiatRates?.[sym] || 0;
                      const fiatVal = calculateAssetFiatValue(bData?.balanceRaw || 0, rate);

                      return (
                        <div
                          key={sym}
                          className="bg-[#0b0c10] border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-2 flex flex-col justify-between text-left transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <CryptoAssetIcon asset={sym} size="sm" />
                              <span className="text-[11px] font-bold text-white">{sym}</span>
                            </div>
                            <span className="text-[8px] text-zinc-500 font-medium">
                              {SUPPORTED_ASSETS[sym].network === 'Polygon' ? 'Polygon' : SUPPORTED_ASSETS[sym].network === 'Ethereum' ? 'Ethereum' : 'Bitcoin'}
                            </span>
                          </div>

                          {bData?.isLoading ? (
                            <div className="space-y-1 my-0.5">
                              <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
                              <div className="h-2 w-10 bg-zinc-800/60 animate-pulse rounded" />
                            </div>
                          ) : bData?.error ? (
                            <span className="text-[9px] text-red-400/90 font-medium truncate">
                              Unable to load
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <div
                                className="text-xs font-mono font-bold text-zinc-100 truncate"
                                title={`${bData?.balance ?? '0'} ${sym}`}
                              >
                                {bData?.balance ?? '0'} <span className="text-[10px] text-zinc-400 font-normal">{sym}</span>
                              </div>
                              <div className="text-[10px] font-mono text-amber-400/90 font-semibold truncate">
                                ≈ {formatFiatAmount(fiatVal, fiatCurrency)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  handleDisconnect();
                  onClose();
                }}
                className="mt-2 w-full py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Disconnect Settlement Wallet
              </button>
            </div>
          )}
        </div>

        {/* Security badge */}
        <div className="pt-2 mt-auto border-t border-zinc-800/60 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Non-custodial. Merchant X never has custody of private keys.</span>
        </div>
      </div>
    </div>
  );
};

