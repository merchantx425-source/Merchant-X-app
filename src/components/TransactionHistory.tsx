import React, { useState } from 'react';
import { TransactionRecord, CryptoAsset, TxStatus } from '../types/merchant';
import { SUPPORTED_FIAT, EXPLORER_URLS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Wallet,
} from 'lucide-react';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  onSelectReceipt: (tx: TransactionRecord) => void;
  onClearHistory?: () => void;
}

type FilterOption = 'ALL' | TxStatus | CryptoAsset;

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onSelectReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('ALL');
  const [inspectedTx, setInspectedTx] = useState<TransactionRecord | null>(null);

  // Filter and search logic
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Status or Asset filter
    if (selectedFilter !== 'ALL') {
      if (['paid', 'pending', 'failed'].includes(selectedFilter)) {
        if (tx.status !== selectedFilter) return false;
      } else {
        if (tx.cryptoAsset !== selectedFilter) return false;
      }
    }

    // 2. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = tx.reference.toLowerCase().includes(q);
      const matchId = tx.id.toLowerCase().includes(q);
      const matchHash = tx.txHash?.toLowerCase().includes(q) || false;
      const matchWallet = tx.merchantWallet.toLowerCase().includes(q);
      const matchAsset = tx.cryptoAsset.toLowerCase().includes(q);
      const matchAmount = tx.amountFiat.toString().includes(q);
      return matchRef || matchId || matchHash || matchWallet || matchAsset || matchAmount;
    }

    return true;
  });

  // Export transactions as CSV
  const handleExportCSV = () => {
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
      'Crypto Asset',
      'Network',
      'Merchant Wallet',
      'Customer Wallet',
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
      t.customerWallet || '',
      t.txHash || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `merchant_x_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterTabs: { label: string; value: FilterOption }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
    { label: 'BTC', value: 'BTC' },
    { label: 'ETH', value: 'ETH' },
    { label: 'USDT', value: 'USDT' },
    { label: 'POL', value: 'POL' },
    { label: 'VERSE', value: 'VERSE' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-xs text-zinc-400">
            {transactions.length} total on-chain settlement record{transactions.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 py-2 px-3 bg-[#181a24] hover:bg-[#202330] disabled:opacity-40 disabled:pointer-events-none border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, hash, amount, or asset..."
            className="w-full bg-[#12141a] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                selectedFilter === tab.value
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'bg-[#14161f] text-zinc-400 hover:text-white border border-zinc-800/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="py-16 px-4 bg-[#12141a] border border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
            <ReceiptIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">No transactions yet</h3>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-xs">
              Completed and verified on-chain payments will be stored here automatically.
            </p>
          </div>
        </div>
      ) : (
        /* Transactions List */
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => {
            const fiatConfig = SUPPORTED_FIAT[tx.fiatCurrency];
            const formattedFiat = `${fiatConfig.symbol}${tx.amountFiat.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const formattedCrypto = `${formatCryptoAmount(tx.amountCrypto, tx.cryptoAsset)} ${tx.cryptoAsset}`;

            return (
              <div
                key={tx.id}
                onClick={() => setInspectedTx(tx)}
                className="p-4 bg-[#14161f] hover:bg-[#1a1d28] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Left Side Icon + Reference */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    {tx.status === 'paid' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : tx.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate group-hover:text-amber-400 transition-colors">
                        {tx.reference}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          tx.status === 'paid'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : tx.status === 'pending'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                            : 'bg-red-950/60 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
                      <span>{tx.formattedDate} {tx.formattedTime}</span>
                      <span>•</span>
                      <span className="text-zinc-400">{tx.network}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Amount */}
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sm sm:text-base font-display text-white">
                    {formattedFiat}
                  </div>
                  <div className="text-xs font-mono text-amber-400 font-medium">
                    {formattedCrypto}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Inspection Detail Modal */}
      {inspectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#13151b] border border-purple-900/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold font-display text-white">Transaction Details</h3>
              <button
                onClick={() => setInspectedTx(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl">
                <span className="text-zinc-400">Status</span>
                <span className="font-bold uppercase text-emerald-400">{inspectedTx.status} ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Transaction ID:</span>
                <span className="font-mono text-white">{inspectedTx.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Reference:</span>
                <span className="font-mono text-amber-400 font-semibold">{inspectedTx.reference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Fiat Amount:</span>
                <span className="font-bold text-white">
                  {SUPPORTED_FIAT[inspectedTx.fiatCurrency].symbol}
                  {inspectedTx.amountFiat.toLocaleString()} {inspectedTx.fiatCurrency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Crypto Settled:</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {inspectedTx.amountCrypto} {inspectedTx.cryptoAsset}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Network:</span>
                <span className="text-white">{inspectedTx.network}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Merchant Wallet:</span>
                <span className="font-mono text-zinc-300">{formatAddress(inspectedTx.merchantWallet, 5)}</span>
              </div>
              {inspectedTx.customerWallet && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Customer Wallet:</span>
                  <span className="font-mono text-zinc-300">{formatAddress(inspectedTx.customerWallet, 5)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Date / Time:</span>
                <span className="text-zinc-300">{inspectedTx.formattedDate} at {inspectedTx.formattedTime}</span>
              </div>

              {inspectedTx.txHash && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Blockchain Explorer:</span>
                  <a
                    href={`${EXPLORER_URLS[inspectedTx.network]}/tx/${inspectedTx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                  >
                    <span>View On-Chain</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const tx = inspectedTx;
                  setInspectedTx(null);
                  onSelectReceipt(tx);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>Open Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
