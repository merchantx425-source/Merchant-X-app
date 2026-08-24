import React, { useState, useMemo } from 'react';
import { useMerchant } from '../../context/MerchantContext';
import { TransactionRecord, CryptoAsset, TxStatus } from '../../types/merchant';
import { SUPPORTED_FIAT, SUPPORTED_ASSETS, EXPLORER_URLS } from '../../config/constants';
import { formatAddress, formatCryptoAmount } from '../../services/blockchainService';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { transactions, exportTransactions, setActiveReceipt } = useMerchant();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [inspectTx, setInspectTx] = useState<TransactionRecord | null>(null);

  const filters = [
    'All',
    'Paid',
    'Pending',
    'Failed',
    'VERSE',
    'POL',
    'USDT',
    'ETH',
    'BTC',
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Status/Asset Filter
      if (selectedFilter === 'Paid' && tx.status !== 'paid') return false;
      if (selectedFilter === 'Pending' && tx.status !== 'pending') return false;
      if (selectedFilter === 'Failed' && tx.status !== 'failed') return false;
      if (
        ['VERSE', 'POL', 'USDT', 'ETH', 'BTC'].includes(selectedFilter) &&
        tx.cryptoAsset !== selectedFilter
      ) {
        return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRef = tx.reference.toLowerCase().includes(query);
        const matchesId = tx.id.toLowerCase().includes(query);
        const matchesHash = (tx.txHash || '').toLowerCase().includes(query);
        const matchesWallet = tx.merchantWallet.toLowerCase().includes(query);
        const matchesAmount = tx.amountFiat.toString().includes(query);
        return matchesRef || matchesId || matchesHash || matchesWallet || matchesAmount;
      }

      return true;
    });
  }, [transactions, selectedFilter, searchQuery]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold font-['Outfit'] tracking-tight text-white">
            Transactions
          </h2>
          <p className="text-xs text-slate-400">
            {transactions.length} total recorded settlements
          </p>
        </div>

        {transactions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportTransactions('csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#202534] border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              title="Export as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportTransactions('json')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#202534] border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              title="Export as JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by ref, hash, address or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#12141c] border border-slate-800/90 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'bg-[#141722] text-slate-400 hover:text-white border border-slate-800/80 hover:bg-[#1c2030]'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Transaction List or Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#10121a] border border-slate-800/80 rounded-3xl text-center my-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
            <ReceiptIcon className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold font-['Outfit'] text-slate-200">
            {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {transactions.length === 0
              ? 'Complete payments on the POS terminal to see verified on-chain settlements here.'
              : 'Try adjusting your search query or filter selection.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const fiatConfig = SUPPORTED_FIAT[tx.fiatCurrency] || SUPPORTED_FIAT.NGN;
            const assetConfig = SUPPORTED_ASSETS[tx.cryptoAsset];

            return (
              <div
                key={tx.id}
                onClick={() => setInspectTx(tx)}
                className="p-3.5 bg-[#12141c] hover:bg-[#181b26] border border-slate-800/80 hover:border-slate-700 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm"
              >
                {/* Left: Asset icon and status */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-['Outfit'] font-black text-sm text-white"
                      style={{
                        backgroundColor: `${assetConfig?.iconColor || '#f59e0b'}22`,
                        border: `1px solid ${assetConfig?.iconColor || '#f59e0b'}44`,
                      }}
                    >
                      {tx.cryptoAsset.slice(0, 3)}
                    </div>
                    {tx.status === 'paid' ? (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-black">
                        ✓
                      </span>
                    ) : tx.status === 'pending' ? (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white animate-spin">
                        ⟳
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white">
                        !
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Outfit'] font-bold text-sm text-white">
                        {fiatConfig.symbol}
                        {tx.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {tx.network}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-['JetBrains_Mono']">
                      {formatCryptoAmount(tx.amountCrypto, tx.cryptoAsset)} {tx.cryptoAsset} • {tx.formattedDate} {tx.formattedTime}
                    </p>
                  </div>
                </div>

                {/* Right: Ref & chevron */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium font-['JetBrains_Mono'] text-slate-400 hidden sm:inline">
                    {tx.reference}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Detail Modal */}
      {inspectTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1017] border border-slate-800 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-['Outfit'] font-bold text-sm text-white">
                Transaction Detail
              </h3>
              <button
                type="button"
                onClick={() => setInspectTx(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Settled Amount
              </span>
              <div className="text-3xl font-extrabold font-['Outfit'] text-white mt-0.5">
                {SUPPORTED_FIAT[inspectTx.fiatCurrency]?.symbol}
                {inspectTx.amountFiat.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs font-bold text-amber-400 font-['JetBrains_Mono'] mt-1">
                {formatCryptoAmount(inspectTx.amountCrypto, inspectTx.cryptoAsset)} {inspectTx.cryptoAsset} ({inspectTx.network})
              </p>
            </div>

            <div className="space-y-2.5 text-xs bg-[#141620] p-4 rounded-2xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="font-['JetBrains_Mono'] text-slate-200">{inspectTx.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`font-semibold capitalize ${
                    inspectTx.status === 'paid'
                      ? 'text-emerald-400'
                      : inspectTx.status === 'pending'
                      ? 'text-blue-400'
                      : 'text-red-400'
                  }`}
                >
                  {inspectTx.status} ✓
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Wallet:</span>
                <span className="font-['JetBrains_Mono'] text-slate-300">
                  {formatAddress(inspectTx.merchantWallet, 6)}
                </span>
              </div>
              {inspectTx.txHash && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Transaction Hash:</span>
                  <a
                    href={`${EXPLORER_URLS[inspectTx.network]}/tx/${inspectTx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-['JetBrains_Mono'] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>{formatAddress(inspectTx.txHash, 5)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-200">
                  {inspectTx.formattedDate} at {inspectTx.formattedTime}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveReceipt(inspectTx);
                  setInspectTx(null);
                }}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>View Full Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
