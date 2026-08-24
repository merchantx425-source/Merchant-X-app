import React, { useState } from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { WALLETCONNECT_PROJECT_ID, SUPPORTED_ASSETS } from '../../config/constants';
import { formatAddress } from '../../services/blockchainService';
import { MerchantXLogo } from '../MerchantXLogo';
import {
  X,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  QrCode,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface WalletConnectModalProps {
  onClose: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ onClose }) => {
  const {
    wallet,
    connectEvmWallet,
    connectBtcWallet,
    disconnectWallet,
    settings,
    updateSettings,
    refreshBalances,
  } = useMerchant();

  const [activeTab, setActiveTab] = useState<'evm' | 'bitcoin' | 'custom'>('evm');
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customEvmInput, setCustomEvmInput] = useState(settings.customEvmReceivingAddress || '');
  const [customBtcInput, setCustomBtcInput] = useState(settings.customBtcReceivingAddress || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleConnectBrowser = async () => {
    setErrorMessage(null);
    setConnecting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        await connectEvmWallet('Browser Wallet');
        setConnecting(false);
      } else {
        setErrorMessage(
          'No Web3 browser extension found (MetaMask / Coinbase / Trust Wallet). You can configure your merchant receiving address directly below.'
        );
        setActiveTab('custom');
        setConnecting(false);
      }
    } catch (err: any) {
      setConnecting(false);
      setErrorMessage(err?.message || 'Wallet connection failed. Please retry.');
    }
  };

  const handleConnectBitcoin = async () => {
    setErrorMessage(null);
    setConnecting(true);
    try {
      const connected = await connectBtcWallet();
      setConnecting(false);
      if (!connected) {
        setErrorMessage(
          'No Bitcoin extension detected (Unisat / Xverse). You can enter your Bitcoin merchant address directly under "Receiving Address".'
        );
        setActiveTab('custom');
      }
    } catch (err: any) {
      setConnecting(false);
      setErrorMessage(err?.message || 'Bitcoin wallet connection failed.');
    }
  };

  const handleSaveCustomAddresses = () => {
    updateSettings({
      customEvmReceivingAddress: customEvmInput.trim(),
      customBtcReceivingAddress: customBtcInput.trim(),
    });
    setSavedSuccess(true);
    refreshBalances();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0e1017] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <MerchantXLogo size="sm" />
            <div>
              <h3 className="font-['Outfit'] font-bold text-sm text-white">
                Merchant Wallet Configuration
              </h3>
              <p className="text-[11px] text-slate-400">
                Multi-chain POS settlement endpoints
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#141620] rounded-xl my-4 border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('evm')}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'evm' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            EVM (ETH / POL)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bitcoin')}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'bitcoin' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bitcoin (BTC)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'custom' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cold Storage
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'evm' && (
          <div className="space-y-3">
            {wallet.evmAddress ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    EVM Wallet Connected ✓
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Chain ID: {wallet.evmChainId || '137 / 1'}
                  </span>
                </div>
                <p className="font-['JetBrains_Mono'] text-xs text-white break-all mb-3 bg-black/40 p-2 rounded-lg">
                  {wallet.evmAddress}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Disconnect Wallet
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectBrowser}
                    className="flex-1 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Reconnect Wallet
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleConnectBrowser}
                  disabled={connecting}
                  className="w-full p-3.5 bg-[#161822] hover:bg-[#1f2332] border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
                      ⟠
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Connect Browser / Extension Wallet
                      </div>
                      <div className="text-[11px] text-slate-400">
                        MetaMask, Coinbase Wallet, Trust Wallet, Rainbow
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>

                <div className="p-3 bg-[#12141c] border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>WalletConnect V2 Integration</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Merchant X uses WalletConnect Project ID for secure POS handshake.
                  </p>
                  <div className="text-[10px] font-['JetBrains_Mono'] text-slate-500 bg-black/40 px-2 py-1 rounded">
                    Project: {WALLETCONNECT_PROJECT_ID.slice(0, 10)}...{WALLETCONNECT_PROJECT_ID.slice(-8)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bitcoin' && (
          <div className="space-y-3">
            {wallet.btcAddress ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Bitcoin Wallet Connected ✓
                  </span>
                  <span className="text-[10px] text-slate-400">Native BTC</span>
                </div>
                <p className="font-['JetBrains_Mono'] text-xs text-white break-all mb-3 bg-black/40 p-2 rounded-lg">
                  {wallet.btcAddress}
                </p>
                <button
                  type="button"
                  onClick={() => connectBtcWallet('')}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Disconnect Bitcoin Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleConnectBitcoin}
                  disabled={connecting}
                  className="w-full p-3.5 bg-[#161822] hover:bg-[#1f2332] border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                      ₿
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        Connect Bitcoin Web Wallet
                      </div>
                      <div className="text-[11px] text-slate-400">
                        UniSat, Xverse, Leather, Phantom Bitcoin
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                EVM Merchant Receiving Address (Polygon / ETH)
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={customEvmInput}
                onChange={(e) => setCustomEvmInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141c] border border-slate-800 rounded-xl text-xs font-['JetBrains_Mono'] text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Settles VERSE, POL, USDT, and ETH into this merchant cold storage or store wallet.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Bitcoin Merchant Receiving Address (BTC)
              </label>
              <input
                type="text"
                placeholder="bc1q... or 1... or 3..."
                value={customBtcInput}
                onChange={(e) => setCustomBtcInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#12141c] border border-slate-800 rounded-xl text-xs font-['JetBrains_Mono'] text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Settles Bitcoin payments directly into this Bitcoin address.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveCustomAddresses}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-['Outfit'] font-bold text-xs rounded-xl transition-colors cursor-pointer mt-2"
            >
              {savedSuccess ? 'Saved Receiving Endpoints ✓' : 'Save Merchant Addresses'}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
