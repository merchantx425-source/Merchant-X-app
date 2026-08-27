import React, { useState, useMemo } from 'react';
import { TransactionRecord, CryptoAsset, TxStatus, AppSettings } from '../types/merchant';
import { SUPPORTED_FIAT, EXPLORER_URLS, DEFAULT_SETTINGS } from '../config/constants';
import { formatCryptoAmount, formatAddress } from '../services/blockchainService';
import { exportTransactionsToPdf } from '../services/pdfExportService';
import { getTranslation } from '../config/i18n';
import { CryptoAssetIcon } from './CryptoAssetIcon';
import {
  Search,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Loader2,
  TrendingUp,
  BarChart3,
  Sparkles,
  PieChart,
  ShieldCheck,
  ArrowUpRight,
  DollarSign,
  Percent,
  Trash2,
  X,
} from 'lucide-react';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  onSelectReceipt: (tx: TransactionRecord) => void;
  onClearHistory?: () => void;
  onDeleteTransaction?: (txId: string) => void;
  language?: string;
  settings?: AppSettings;
  isPro?: boolean;
  onUpgradePro?: () => void;
}

type ViewMode = 'ledger' | 'analytics';
type FilterOption = 'ALL' | TxStatus | CryptoAsset;

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onSelectReceipt,
  onClearHistory,
  onDeleteTransaction,
  language = 'en',
  settings,
  isPro = false,
  onUpgradePro,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('ALL');
  const [inspectedTx, setInspectedTx] = useState<TransactionRecord | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<TransactionRecord | null>(null);

  // Filter and search logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
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
  }, [transactions, selectedFilter, searchQuery]);

  // Analytics Computation
  const analytics = useMemo(() => {
    const paidTxs = transactions.filter((t) => t.status === 'paid');
    const totalVolumeFiat = paidTxs.reduce((sum, t) => sum + (t.amountFiat || 0), 0);
    const avgTicket = paidTxs.length > 0 ? totalVolumeFiat / paidTxs.length : 0;
    const fiatCurrency = settings?.fiatCurrency || 'NGN';
    const fiatSymbol = SUPPORTED_FIAT[fiatCurrency]?.symbol || '$';

    // Asset Breakdown
    const assetTotals: Record<CryptoAsset, { count: number; volumeFiat: number }> = {
      VERSE: { count: 0, volumeFiat: 0 },
      POL: { count: 0, volumeFiat: 0 },
      USDT: { count: 0, volumeFiat: 0 },
      USDC: { count: 0, volumeFiat: 0 },
      ETH: { count: 0, volumeFiat: 0 },
      BTC: { count: 0, volumeFiat: 0 },
    };

    paidTxs.forEach((t) => {
      if (assetTotals[t.cryptoAsset]) {
        assetTotals[t.cryptoAsset].count += 1;
        assetTotals[t.cryptoAsset].volumeFiat += t.amountFiat || 0;
      }
    });

    // 7-day activity buckets
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * dayMs;
      const dayEnd = dayStart + dayMs;
      const dayName = new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' });
      const dayTxs = paidTxs.filter((t) => t.timestamp >= dayStart && t.timestamp < dayEnd);
      const volume = dayTxs.reduce((sum, t) => sum + (t.amountFiat || 0), 0);
      return { dayName, count: dayTxs.length, volume };
    });

    const maxDayVolume = Math.max(...last7Days.map((d) => d.volume), 1);
    const feeSavings = totalVolumeFiat * 0.025; // 2.5% standard processor fee savings

    return {
      totalVolumeFiat,
      avgTicket,
      totalCount: paidTxs.length,
      successRate: transactions.length > 0 ? Math.round((paidTxs.length / transactions.length) * 100) : 100,
      fiatSymbol,
      fiatCurrency,
      assetTotals,
      last7Days,
      maxDayVolume,
      feeSavings,
    };
  }, [transactions, settings?.fiatCurrency]);

  // Export filtered transactions as PDF
  const handleExportPDF = () => {
    setIsExportingPdf(true);
    try {
      const activeSettings: AppSettings = settings || DEFAULT_SETTINGS;
      const dataset = filteredTransactions.length > 0 ? filteredTransactions : transactions;
      exportTransactionsToPdf(dataset, activeSettings);
    } catch (err) {
      console.warn('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export transactions as CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const dataset = filteredTransactions.length > 0 ? filteredTransactions : transactions;

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

    const rows = dataset.map((t) => [
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
    link.setAttribute('download', `MerchantX_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterTabs: { label: string; value: FilterOption }[] = [
    { label: getTranslation(language, 'all'), value: 'ALL' },
    { label: getTranslation(language, 'paid'), value: 'paid' },
    { label: getTranslation(language, 'pending'), value: 'pending' },
    { label: 'USDC', value: 'USDC' },
    { label: 'VERSE', value: 'VERSE' },
    { label: 'USDT', value: 'USDT' },
    { label: 'POL', value: 'POL' },
    { label: 'ETH', value: 'ETH' },
    { label: 'BTC', value: 'BTC' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 px-2 sm:px-4 animate-in fade-in duration-200">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              {viewMode === 'ledger' ? getTranslation(language, 'txHistory') : 'Merchant Analytics'}
            </h1>
            {isPro && (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase rounded-full">
                PRO UNLOCKED ✓
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {transactions.length} total on-chain settlement record{transactions.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-[#12141c] p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'ledger'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ReceiptIcon className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={transactions.length === 0 || isExportingPdf}
            className="flex items-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-black text-black transition-all shadow-md cursor-pointer active:scale-[0.98]"
            title="Download PDF statement"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-black" />
            )}
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 py-2 px-3 bg-[#181a24] hover:bg-[#202330] disabled:opacity-40 disabled:pointer-events-none border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV</span>
          </button>

            {/* Delete All Transactions Button */}
            {onClearHistory && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={transactions.length === 0}
                className="flex items-center gap-1.5 py-2 px-3 bg-red-950/50 hover:bg-red-900/80 disabled:opacity-40 disabled:pointer-events-none border border-red-800/80 rounded-xl text-xs font-bold text-red-300 hover:text-red-100 transition-all cursor-pointer shrink-0 active:scale-95"
                title="Delete all transactions history"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>

      {/* VIEW 1: ANALYTICS DASHBOARD */}
      {viewMode === 'analytics' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 bg-[#141622] border border-zinc-800 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-400" />
                <span>Total Settled Volume</span>
              </div>
              <div className="text-xl font-black font-display text-white">
                {analytics.fiatSymbol}{analytics.totalVolumeFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                100% Non-Custodial
              </div>
            </div>

            <div className="p-3.5 bg-[#141622] border border-zinc-800 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Success Rate</span>
              </div>
              <div className="text-xl font-black font-display text-emerald-400">
                {analytics.successRate}%
              </div>
              <div className="text-[10px] text-zinc-400">
                {analytics.totalCount} confirmed orders
              </div>
            </div>

            <div className="p-3.5 bg-[#141622] border border-zinc-800 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span>Avg. Ticket Size</span>
              </div>
              <div className="text-xl font-black font-display text-white">
                {analytics.fiatSymbol}{analytics.avgTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-400">
                Per customer charge
              </div>
            </div>

            <div className="p-3.5 bg-[#141622] border border-zinc-800 rounded-2xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Processor Savings</span>
              </div>
              <div className="text-xl font-black font-display text-amber-300">
                {analytics.fiatSymbol}{analytics.feeSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-zinc-400">
                0% Merchant fee tier
              </div>
            </div>
          </div>

          {/* 7-Day Settlement Trend Graph */}
          <div className="p-4 bg-[#141622] border border-zinc-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>7-Day Settlement Activity</span>
              <span className="text-[11px] text-zinc-400 font-normal">Last 7 calendar days</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4 pb-1">
              {analytics.last7Days.map((d, idx) => {
                const heightPct = Math.max(8, Math.round((d.volume / analytics.maxDayVolume) * 100));
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-zinc-800/80 rounded-lg overflow-hidden flex flex-col justify-end h-20">
                      <div
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-md transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{d.dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Asset Settlement Distribution */}
          <div className="p-4 bg-[#141622] border border-zinc-800 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>Settlement Volume by Crypto Asset</span>
              <span className="text-[11px] text-zinc-400 font-normal">Multi-chain distribution</span>
            </div>

            <div className="space-y-2.5">
              {(Object.keys(analytics.assetTotals) as CryptoAsset[]).map((asset) => {
                const data = analytics.assetTotals[asset];
                const pct = analytics.totalVolumeFiat > 0 ? Math.round((data.volumeFiat / analytics.totalVolumeFiat) * 100) : 0;
                return (
                  <div key={asset} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <CryptoAssetIcon asset={asset} size="sm" />
                        <span className="font-bold text-white">{asset}</span>
                        <span className="text-zinc-500 text-[10px]">({data.count} tx)</span>
                      </div>
                      <span className="font-mono font-semibold text-zinc-200">
                        {analytics.fiatSymbol}{data.volumeFiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, data.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LEDGER HISTORY */}
      {viewMode === 'ledger' && (
        <div className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation(language, 'searchPlaceholder')}
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
                <h3 className="text-sm font-semibold text-zinc-300">{getTranslation(language, 'noTxYet')}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                  {getTranslation(language, 'noTxSub')}
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

                    {/* Right Side Amount & Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className="font-extrabold text-sm sm:text-base font-display text-white">
                          {formattedFiat}
                        </div>
                        <div className="text-xs font-mono text-amber-400 font-medium">
                          {formattedCrypto}
                        </div>
                      </div>

                      {/* Quick Delete Single Transaction Button */}
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTxToDelete(tx);
                          }}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl border border-transparent hover:border-red-800/40 transition-all cursor-pointer"
                          title="Delete this transaction record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-xl">
                <span className="text-zinc-400">{getTranslation(language, 'status')}</span>
                <span className="font-bold uppercase text-emerald-400">{inspectedTx.status} ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Transaction ID:</span>
                <span className="font-mono text-white">{inspectedTx.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'reference')}:</span>
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
                <span className="text-zinc-400">{getTranslation(language, 'merchantWallet')}:</span>
                <span className="font-mono text-zinc-300">{formatAddress(inspectedTx.merchantWallet, 5)}</span>
              </div>
              {inspectedTx.customerWallet && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">{getTranslation(language, 'customerWallet')}:</span>
                  <span className="font-mono text-zinc-300">{formatAddress(inspectedTx.customerWallet, 5)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{getTranslation(language, 'date')} / {getTranslation(language, 'time')}:</span>
                <span className="text-zinc-300">{inspectedTx.formattedDate} at {inspectedTx.formattedTime}</span>
              </div>

              {inspectedTx.txHash && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">{getTranslation(language, 'txHash')}:</span>
                  <a
                    href={`${EXPLORER_URLS[inspectedTx.network]}/tx/${inspectedTx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1"
                  >
                    <span>{formatAddress(inspectedTx.txHash, 6)}</span>
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
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>{getTranslation(language, 'officialReceipt')}</span>
              </button>

              {onDeleteTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    const tx = inspectedTx;
                    setInspectedTx(null);
                    setTxToDelete(tx);
                  }}
                  className="py-3 px-4 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete this transaction"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Transaction Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[#141622] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-display text-white">Delete Transaction?</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Are you sure you want to delete transaction <strong className="text-amber-400 font-mono">{txToDelete.reference}</strong> ({SUPPORTED_FIAT[txToDelete.fiatCurrency].symbol}{txToDelete.amountFiat.toLocaleString()})?
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (txToDelete) {
                    onDeleteTransaction?.(txToDelete.id);
                    setTxToDelete(null);
                  }
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-lg shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Transactions Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[#141622] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold font-display text-white">Delete All Transactions?</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                This will permanently delete all <strong className="text-white">{transactions.length}</strong> recorded on-chain transaction{transactions.length === 1 ? '' : 's'} and ledger history from this terminal.
              </p>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-[11px] text-red-300 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>This action cannot be undone. Make sure you downloaded your PDF statement or CSV if needed.</span>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearHistory?.();
                  setShowDeleteModal(false);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-lg shadow-red-600/30"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
