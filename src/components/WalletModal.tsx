import React, { useState } from 'react';
import { ethers } from 'ethers';
import { WALLETCONNECT_PROJECT_ID } from '../config/constants';
import { WalletState } from '../types/merchant';
import { X, ShieldCheck, ExternalLink, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { MerchantXLogo } from './MerchantXLogo';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  onConnectWallet: (evmAddress: string | null, btcAddress: string | null, providerName: string) => void;
  onDisconnectWallet: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletState,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  const [activeTab, setActiveTab] = useState<'evm' | 'bitcoin' | 'manual'>('evm');
  const [manualEvm, setManualEvm] = useState('');
  const [manualBtc, setManualBtc] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real EVM Injected Connect (MetaMask, Coinbase Wallet, Trust, Rainbow, Brave, etc.)
  const handleConnectInjected = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts && accounts.length > 0) {
          const network = await provider.getNetwork();
          onConnectWallet(accounts[0], walletState.btcAddress, 'Browser Wallet / MetaMask');
          onClose();
        } else {
          setErrorMsg('No accounts returned from wallet.');
        }
      } else {
        // Fallback for mobile / browsers without injected extension
        setErrorMsg('No browser extension found. You can enter your merchant receiving address directly below.');
        setActiveTab('manual');
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      if (err.code === 4001) {
        setErrorMsg('Connection request was rejected by user.');
      } else {
        setErrorMsg(err.message || 'Wallet connection failed. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect Bitcoin Injected Wallet (Unisat, Xverse, OKX, Leather)
  const handleConnectBitcoin = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const win = window as any;
      if (win.unisat) {
        const accounts = await win.unisat.requestAccounts();
        if (accounts && accounts.length > 0) {
          onConnectWallet(walletState.evmAddress, accounts[0], 'UniSat Bitcoin Wallet');
          onClose();
          return;
        }
      } else if (win.BitcoinProvider || win.xverse) {
        const accounts = await (win.BitcoinProvider || win.xverse).request('getAccounts', {
          purposes: ['payment', 'ordinals'],
        });
        if (accounts && accounts.length > 0) {
          const paymentAddr = accounts[0].address || accounts[0];
          onConnectWallet(walletState.evmAddress, paymentAddr, 'Xverse Bitcoin Wallet');
          onClose();
          return;
        }
      } else if (win.okxwallet?.bitcoin) {
        const result = await win.okxwallet.bitcoin.connect();
        if (result && result.address) {
          onConnectWallet(walletState.evmAddress, result.address, 'OKX Bitcoin Wallet');
          onClose();
          return;
        }
      }

      setErrorMsg('No native Bitcoin browser extension detected. Please paste your merchant Bitcoin receiving address below.');
      setActiveTab('manual');
    } catch (err: any) {
      setErrorMsg(err.message || 'Bitcoin wallet connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveManualAddresses = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let cleanEvm = manualEvm.trim();
    let cleanBtc = manualBtc.trim();

    if (cleanEvm && !cleanEvm.startsWith('0x')) {
      setErrorMsg('Invalid EVM address: must start with 0x and be 42 characters.');
      return;
    }
    if (cleanEvm && cleanEvm.length !== 42) {
      setErrorMsg('Invalid EVM address length.');
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

    onConnectWallet(cleanEvm || walletState.evmAddress, cleanBtc || walletState.btcAddress, 'Merchant Terminal Address');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#13151b] border border-purple-900/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <MerchantXLogo size="sm" />
            <div>
              <h2 className="text-lg font-bold font-display text-white tracking-tight">Connect Merchant Wallet</h2>
              <p className="text-xs text-zinc-400">Receive crypto settlement securely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-[#0b0c10] p-1 rounded-xl my-4 border border-zinc-800/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('evm'); setErrorMsg(null); }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'evm'
                ? 'bg-amber-500 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            EVM (Polygon/ETH)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('bitcoin'); setErrorMsg(null); }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'bitcoin'
                ? 'bg-amber-500 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Bitcoin (BTC)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('manual'); setErrorMsg(null); }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'manual'
                ? 'bg-amber-500 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Direct Address
          </button>
        </div>

        {/* Status / Error feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Content based on Tab */}
        {activeTab === 'evm' && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-zinc-300">
              Connect to receive <span className="text-amber-400 font-medium">VERSE, POL, USDT, and ETH</span> directly to your self-custody wallet.
            </p>

            <button
              onClick={handleConnectInjected}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 bg-[#1a1c24] hover:bg-[#222530] border border-zinc-700/60 hover:border-amber-500/50 rounded-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-600/20 flex items-center justify-center border border-amber-500/30">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm text-white group-hover:text-amber-300">
                    Browser Wallet / MetaMask
                  </div>
                  <div className="text-[11px] text-zinc-400">MetaMask, Coinbase, Rainbow, Brave</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <div className="p-3 bg-[#0c0d12] rounded-xl border border-zinc-800/70 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>WalletConnect Project Config:</span>
              <span className="font-mono text-zinc-500">{WALLETCONNECT_PROJECT_ID.slice(0, 8)}...</span>
            </div>
          </div>
        )}

        {activeTab === 'bitcoin' && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-zinc-300">
              Connect a native Bitcoin wallet for direct on-chain BTC settlement without intermediaries.
            </p>

            <button
              onClick={handleConnectBitcoin}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 bg-[#1a1c24] hover:bg-[#222530] border border-zinc-700/60 hover:border-amber-500/50 rounded-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-500 font-bold text-lg">
                  ₿
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm text-white group-hover:text-amber-300">
                    Bitcoin Extension Wallet
                  </div>
                  <div className="text-[11px] text-zinc-400">UniSat, Xverse, OKX Wallet</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        )}

        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualAddresses} className="space-y-3 py-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                EVM Receiving Address (Polygon / Ethereum)
              </label>
              <input
                type="text"
                value={manualEvm}
                onChange={(e) => setManualEvm(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[#0b0c10] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Used for VERSE, POL, USDT, and ETH settlements.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Bitcoin Receiving Address (BTC)
              </label>
              <input
                type="text"
                value={manualBtc}
                onChange={(e) => setManualBtc(e.target.value)}
                placeholder="bc1q... or 1... or 3..."
                className="w-full bg-[#0b0c10] border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Used for Bitcoin payments.</p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 mt-2"
            >
              Set Terminal Receiving Address
            </button>
          </form>
        )}

        {/* Current status if already connected */}
        {(walletState.evmAddress || walletState.btcAddress) && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80">
            <div className="text-xs text-zinc-400 mb-2 font-medium">Currently Configured:</div>
            {walletState.evmAddress && (
              <div className="text-xs font-mono bg-zinc-900/90 p-2 rounded-lg text-amber-300/90 flex items-center justify-between mb-1">
                <span>EVM: {walletState.evmAddress.slice(0, 8)}...{walletState.evmAddress.slice(-6)}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
            {walletState.btcAddress && (
              <div className="text-xs font-mono bg-zinc-900/90 p-2 rounded-lg text-amber-400 flex items-center justify-between">
                <span>BTC: {walletState.btcAddress.slice(0, 8)}...{walletState.btcAddress.slice(-6)}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
            <button
              onClick={() => {
                onDisconnectWallet();
                onClose();
              }}
              className="mt-3 w-full py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        )}

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Non-custodial. Merchant X never has access to your private keys.</span>
        </div>
      </div>
    </div>
  );
};
