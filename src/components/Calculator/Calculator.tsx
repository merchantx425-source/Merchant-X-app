import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CurrencyItem,
  CURRENCY_MAP,
  CALCULATOR_CRYPTO_LIST,
  CALCULATOR_FIAT_LIST,
  calculateConversion,
  formatCurrencyValue,
} from '../../services/currencyRateService';
import { CurrencySelectModal } from './CurrencySelectModal';
import { LiveRatesResult, fetchLiveCryptoRates } from '../../services/blockchainService';
import { AppSettings, CryptoAsset, FiatCurrency } from '../../types/merchant';
import {
  ArrowRightLeft,
  RotateCcw,
  Delete,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Layers,
  Coins,
  ChevronDown,
  Info,
  AlertCircle,
} from 'lucide-react';

interface CalculatorProps {
  settings: AppSettings;
  onUseAmountForPayment: (amount: number, currency: CurrencyItem) => void;
  onOpenSettings?: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  settings,
  onUseAmountForPayment,
  onOpenSettings,
}) => {
  // Mode: Standard vs Crypto Calculator
  const [calculatorMode, setCalculatorMode] = useState<'standard' | 'crypto'>('standard');

  // Selected Currencies
  const [fromCurrency, setFromCurrency] = useState<CurrencyItem>(() => {
    return CURRENCY_MAP[settings.fiatCurrency] || CURRENCY_MAP.USD;
  });

  const [toCurrency, setToCurrency] = useState<CurrencyItem>(() => {
    // Default target: if from is Fiat, default to VERSE or NGN; if from is Crypto, default to USD or NGN
    return CURRENCY_MAP.NGN || CURRENCY_MAP.VERSE;
  });

  // Modal selector states
  const [isFromModalOpen, setIsFromModalOpen] = useState(false);
  const [isToModalOpen, setIsToModalOpen] = useState(false);

  // Expression & Display State
  const [expression, setExpression] = useState<string>('0');
  const [lastCalculatedValue, setLastCalculatedValue] = useState<number>(0);
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false);

  // Live Exchange Rates Data
  const [liveRates, setLiveRates] = useState<LiveRatesResult | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastRatesUpdated, setLastRatesUpdated] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Success transfer toast
  const [transferToast, setTransferToast] = useState<string | null>(null);

  // Quick switch pills
  const quickTargetPills: CurrencyItem[] = useMemo(() => {
    if (calculatorMode === 'crypto') {
      return [
        CURRENCY_MAP.USD,
        CURRENCY_MAP.NGN,
        CURRENCY_MAP.EUR,
        CURRENCY_MAP.VERSE,
        CURRENCY_MAP.BTC,
        CURRENCY_MAP.ETH,
        CURRENCY_MAP.POL,
        CURRENCY_MAP.USDT,
      ];
    }
    return [
      CURRENCY_MAP.NGN,
      CURRENCY_MAP.USD,
      CURRENCY_MAP.EUR,
      CURRENCY_MAP.GBP,
      CURRENCY_MAP.VERSE,
      CURRENCY_MAP.BTC,
      CURRENCY_MAP.ETH,
      CURRENCY_MAP.USDT,
    ];
  }, [calculatorMode]);

  // Fetch Live Rates
  const loadRates = useCallback(async () => {
    try {
      setIsLoadingRates(true);
      setRatesError(null);
      const fiatCode = (settings.fiatCurrency || 'USD') as FiatCurrency;
      const res = await fetchLiveCryptoRates(fiatCode);
      setLiveRates(res);
      setLastRatesUpdated(Date.now());
      setSecondsAgo(0);
    } catch (err: any) {
      console.warn('Calculator rates load warning:', err);
      setRatesError('Unable to retrieve live exchange rate');
    } finally {
      setIsLoadingRates(false);
    }
  }, [settings.fiatCurrency]);

  useEffect(() => {
    loadRates();
    const interval = setInterval(loadRates, 25000); // 25s auto-refresh
    return () => clearInterval(interval);
  }, [loadRates]);

  // Update seconds ago timer
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastRatesUpdated) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRatesUpdated]);

  // Sound & Haptic helper
  const triggerFeedback = () => {
    if (settings.hapticEnabled && typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  // Safe Math Expression Evaluator
  const evaluateExpression = (expr: string): number => {
    if (!expr || expr.trim() === '') return 0;

    try {
      // Clean up string: replace display symbols
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/,/g, '');

      // Remove trailing operators
      while (['+', '-', '*', '/'].includes(sanitized.slice(-1))) {
        sanitized = sanitized.slice(0, -1);
      }

      if (!sanitized) return 0;

      // Handle percentages e.g. 50 + 10% -> 50 + (50 * 0.1) or simple 50% -> 0.5
      // Replace X% with (X/100)
      sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

      // Validate sanitized expression only contains safe math characters
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        return 0;
      }

      // Safe Function evaluation
      // eslint-disable-next-line no-new-func
      const result = new Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.max(0, result);
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // Derive current numeric value
  const currentValue = useMemo(() => {
    if (hasEvaluated) {
      return lastCalculatedValue;
    }
    return evaluateExpression(expression);
  }, [expression, hasEvaluated, lastCalculatedValue]);

  // Calculate dynamic conversion
  const conversion = useMemo(() => {
    return calculateConversion(currentValue, fromCurrency.id, toCurrency.id, liveRates);
  }, [currentValue, fromCurrency.id, toCurrency.id, liveRates]);

  // Keypad Handlers
  const handleDigit = (digit: string) => {
    triggerFeedback();
    setHasEvaluated(false);

    setExpression((prev) => {
      if (prev === '0' && digit !== '.') {
        return digit;
      }
      if (digit === '.') {
        // Prevent duplicate decimal in current number token
        const tokens = prev.split(/[\+\−\×\÷\-\*\/]/);
        const lastToken = tokens[tokens.length - 1] || '';
        if (lastToken.includes('.')) {
          return prev;
        }
        if (prev === '' || ['+', '-', '×', '÷'].includes(prev.slice(-1))) {
          return prev + '0.';
        }
      }
      // Max length guard
      if (prev.length >= 32) return prev;
      return prev + digit;
    });
  };

  const handleOperator = (op: string) => {
    triggerFeedback();
    setHasEvaluated(false);

    setExpression((prev) => {
      const lastChar = prev.slice(-1);
      if (['+', '−', '×', '÷', '-', '*', '/'].includes(lastChar)) {
        // Replace previous operator
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  };

  const handlePercentage = () => {
    triggerFeedback();
    setHasEvaluated(false);
    setExpression((prev) => {
      const lastChar = prev.slice(-1);
      if (['+', '−', '×', '÷', '%'].includes(lastChar)) return prev;
      return prev + '%';
    });
  };

  const handleClear = () => {
    triggerFeedback();
    setExpression('0');
    setLastCalculatedValue(0);
    setHasEvaluated(false);
  };

  const handleBackspace = () => {
    triggerFeedback();
    setHasEvaluated(false);
    setExpression((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleEquals = () => {
    triggerFeedback();
    const result = evaluateExpression(expression);
    setLastCalculatedValue(result);
    setHasEvaluated(true);
    // Format expression to clean result
    if (fromCurrency.type === 'crypto' && fromCurrency.id === 'BTC') {
      setExpression(result.toFixed(8).replace(/\.?0+$/, ''));
    } else if (fromCurrency.type === 'crypto') {
      setExpression(result.toString());
    } else {
      setExpression(result.toLocaleString('en-US', { maximumFractionDigits: 4 }).replace(/,/g, ''));
    }
  };

  // Swap currencies
  const handleSwapCurrencies = () => {
    triggerFeedback();
    const prevFrom = fromCurrency;
    const prevTo = toCurrency;
    setFromCurrency(prevTo);
    setToCurrency(prevFrom);
  };

  // Quick switch conversion target
  const handleSelectQuickTarget = (target: CurrencyItem) => {
    triggerFeedback();
    if (target.id === fromCurrency.id) {
      handleSwapCurrencies();
      return;
    }
    setToCurrency(target);
  };

  // Use Amount for Payment
  const handleUseForPayment = () => {
    triggerFeedback();
    if (currentValue <= 0) return;

    // Call the parent handler
    onUseAmountForPayment(currentValue, fromCurrency);

    setTransferToast(`Transferred ${formatCurrencyValue(currentValue, fromCurrency)} to POS`);
    setTimeout(() => {
      setTransferToast(null);
    }, 3000);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key);
      } else if (e.key === '.') {
        handleDigit('.');
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('−');
      } else if (e.key === '*') {
        handleOperator('×');
      } else if (e.key === '/') {
        handleOperator('÷');
      } else if (e.key === '%') {
        handlePercentage();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col justify-between px-3 sm:px-4 py-3 pb-24 space-y-3.5">
      {/* Toast Notification */}
      {transferToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{transferToast}</span>
        </div>
      )}

      {/* TOP HEADER & MODE TOGGLE */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black font-display text-white tracking-tight flex items-center gap-2">
            <span>Multi-Currency Calculator</span>
          </h1>
          <p className="text-[11px] text-zinc-400">
            Live FX & crypto calculation with instant conversion
          </p>
        </div>

        {/* Mode Toggle: Standard vs Crypto */}
        <div className="flex items-center p-1 bg-[#121522] border border-zinc-800 rounded-xl">
          <button
            id="calc-mode-standard"
            type="button"
            onClick={() => {
              setCalculatorMode('standard');
              triggerFeedback();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              calculatorMode === 'standard'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Standard
          </button>
          <button
            id="calc-mode-crypto"
            type="button"
            onClick={() => {
              setCalculatorMode('crypto');
              triggerFeedback();
              // If from is not crypto, switch to BTC or VERSE
              if (fromCurrency.type !== 'crypto') {
                setFromCurrency(CURRENCY_MAP.BTC);
                setToCurrency(CURRENCY_MAP.USD);
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              calculatorMode === 'crypto'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Coins className="w-3 h-3" />
            <span>Crypto</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL CURRENCY SELECTOR BAR */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2 bg-[#10131e] border border-zinc-800/90 rounded-2xl shadow-inner">
        {/* Source Currency Selector ("Calculate in") */}
        <button
          id="btn-select-from-currency"
          type="button"
          onClick={() => {
            triggerFeedback();
            setIsFromModalOpen(true);
          }}
          className="flex flex-col items-start p-2.5 bg-[#171b2b] hover:bg-[#1f243a] border border-zinc-700/80 rounded-xl transition-all cursor-pointer group text-left"
        >
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Calculate in
          </span>
          <div className="flex items-center justify-between w-full mt-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-black text-white tracking-wide">
                {fromCurrency.code}
              </span>
              <span className="text-xs text-zinc-400 truncate max-w-[65px]">
                ({fromCurrency.symbol})
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
          </div>
        </button>

        {/* Swap Button */}
        <button
          id="btn-swap-currencies"
          type="button"
          onClick={handleSwapCurrencies}
          title="Swap source and target currencies"
          className="p-2 bg-[#171b2b] hover:bg-amber-500 hover:text-black text-zinc-300 border border-zinc-700/80 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        {/* Target Currency Selector ("Convert result to") */}
        <button
          id="btn-select-to-currency"
          type="button"
          onClick={() => {
            triggerFeedback();
            setIsToModalOpen(true);
          }}
          className="flex flex-col items-start p-2.5 bg-[#171b2b] hover:bg-[#1f243a] border border-amber-500/30 hover:border-amber-500/60 rounded-xl transition-all cursor-pointer group text-left"
        >
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
            Convert to
          </span>
          <div className="flex items-center justify-between w-full mt-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-black text-amber-300 tracking-wide">
                {toCurrency.code}
              </span>
              <span className="text-xs text-zinc-400 truncate max-w-[65px]">
                ({toCurrency.symbol})
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
          </div>
        </button>
      </div>

      {/* 3. MAIN CALCULATOR DISPLAY & CONVERSION SCREEN */}
      <div className="relative p-4 sm:p-5 bg-gradient-to-b from-[#121522] via-[#0d101a] to-[#0a0c13] border border-zinc-800/90 rounded-3xl shadow-2xl space-y-3 overflow-hidden">
        {/* Expression Row */}
        <div className="flex items-center justify-between text-zinc-400 font-mono text-xs overflow-x-auto whitespace-nowrap pb-1">
          <span className="text-[11px] text-zinc-400 font-sans font-semibold">
            Input ({fromCurrency.code})
          </span>
          <span className="text-zinc-300 text-sm tracking-wider">{expression}</span>
        </div>

        {/* Primary Evaluated Total in Source Currency */}
        <div className="flex items-baseline justify-between border-b border-zinc-800/70 pb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Total {fromCurrency.code}
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
            {formatCurrencyValue(currentValue, fromCurrency)}
          </div>
        </div>

        {/* Secondary Converted Result in Target Currency */}
        <div className="bg-[#151928]/90 border border-amber-500/30 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                Live Converted Result
              </span>
              {conversion.isAvailable && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              {conversion.isAvailable ? conversion.formattedRate : ratesError || 'Rate unavailable'}
            </div>
          </div>

          <div className="text-right">
            {conversion.isAvailable ? (
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight">
                ≈ {conversion.formattedResult}
              </div>
            ) : (
              <div className="text-sm font-bold text-red-400 flex items-center justify-end gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Rate unavailable</span>
              </div>
            )}
          </div>
        </div>

        {/* Rate Timestamp & Refresh Row */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>
              {secondsAgo < 5
                ? 'Rate updated: Just now'
                : `Rate updated: ${secondsAgo}s ago`}
            </span>
          </div>

          <button
            id="btn-refresh-calc-rates"
            type="button"
            onClick={() => {
              triggerFeedback();
              loadRates();
            }}
            disabled={isLoadingRates}
            className="flex items-center gap-1 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh live exchange rates"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingRates ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4. QUICK CONVERSION TARGET PILLS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold px-1">
          <span>Quick Switch Target:</span>
          <span className="text-[10px] text-amber-400 font-mono">1-Tap Conversion</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickTargetPills.map((pill) => {
            const isSelected = toCurrency.id === pill.id;
            return (
              <button
                key={pill.id}
                id={`quick-pill-${pill.id.toLowerCase()}`}
                type="button"
                onClick={() => handleSelectQuickTarget(pill)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-[#121522] hover:bg-[#181d30] text-zinc-300 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {pill.code}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. CALCULATOR KEYPAD */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {/* Row 1: Clear, Backspace, %, Division */}
        <button
          id="btn-calc-clear"
          type="button"
          onClick={handleClear}
          className="h-13 sm:h-14 bg-[#1f1924] hover:bg-[#2b2133] active:bg-[#382b43] text-red-400 font-black text-sm sm:text-base rounded-2xl border border-red-500/20 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          AC
        </button>
        <button
          id="btn-calc-backspace"
          type="button"
          onClick={handleBackspace}
          className="h-13 sm:h-14 bg-[#161a28] hover:bg-[#20263b] active:bg-[#2a324d] text-zinc-300 font-bold text-sm sm:text-base rounded-2xl border border-zinc-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-sm"
        >
          <Delete className="w-5 h-5" />
        </button>
        <button
          id="btn-calc-percent"
          type="button"
          onClick={handlePercentage}
          className="h-13 sm:h-14 bg-[#161a28] hover:bg-[#20263b] active:bg-[#2a324d] text-amber-400 font-bold text-base sm:text-lg rounded-2xl border border-zinc-800 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          %
        </button>
        <button
          id="btn-calc-divide"
          type="button"
          onClick={() => handleOperator('÷')}
          className="h-13 sm:h-14 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 font-black text-lg sm:text-xl rounded-2xl border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          ÷
        </button>

        {/* Row 2: 7, 8, 9, Multiplication */}
        <button
          id="btn-calc-7"
          type="button"
          onClick={() => handleDigit('7')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          7
        </button>
        <button
          id="btn-calc-8"
          type="button"
          onClick={() => handleDigit('8')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          8
        </button>
        <button
          id="btn-calc-9"
          type="button"
          onClick={() => handleDigit('9')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          9
        </button>
        <button
          id="btn-calc-multiply"
          type="button"
          onClick={() => handleOperator('×')}
          className="h-13 sm:h-14 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 font-black text-lg sm:text-xl rounded-2xl border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          ×
        </button>

        {/* Row 3: 4, 5, 6, Subtraction */}
        <button
          id="btn-calc-4"
          type="button"
          onClick={() => handleDigit('4')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          4
        </button>
        <button
          id="btn-calc-5"
          type="button"
          onClick={() => handleDigit('5')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          5
        </button>
        <button
          id="btn-calc-6"
          type="button"
          onClick={() => handleDigit('6')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          6
        </button>
        <button
          id="btn-calc-minus"
          type="button"
          onClick={() => handleOperator('−')}
          className="h-13 sm:h-14 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 font-black text-lg sm:text-xl rounded-2xl border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          −
        </button>

        {/* Row 4: 1, 2, 3, Addition */}
        <button
          id="btn-calc-1"
          type="button"
          onClick={() => handleDigit('1')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          1
        </button>
        <button
          id="btn-calc-2"
          type="button"
          onClick={() => handleDigit('2')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          2
        </button>
        <button
          id="btn-calc-3"
          type="button"
          onClick={() => handleDigit('3')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          3
        </button>
        <button
          id="btn-calc-plus"
          type="button"
          onClick={() => handleOperator('+')}
          className="h-13 sm:h-14 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 font-black text-lg sm:text-xl rounded-2xl border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          +
        </button>

        {/* Row 5: 0, Decimal, Equals (span 2) */}
        <button
          id="btn-calc-0"
          type="button"
          onClick={() => handleDigit('0')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-extrabold text-base sm:text-lg rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          0
        </button>
        <button
          id="btn-calc-dot"
          type="button"
          onClick={() => handleDigit('.')}
          className="h-13 sm:h-14 bg-[#121522] hover:bg-[#1a1f33] active:bg-[#232a45] text-white font-black text-lg sm:text-xl rounded-2xl border border-zinc-800/90 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          .
        </button>
        <button
          id="btn-calc-equals"
          type="button"
          onClick={handleEquals}
          className="col-span-2 h-13 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:from-amber-600 active:to-amber-500 text-black font-black text-lg sm:text-xl rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
        >
          <span>=</span>
        </button>
      </div>

      {/* 6. USE AMOUNT FOR PAYMENT ACTION BUTTON */}
      <button
        id="btn-use-amount-for-payment"
        type="button"
        onClick={handleUseForPayment}
        disabled={currentValue <= 0}
        className="w-full py-3.5 px-4 bg-[#161a28] hover:bg-amber-500/20 hover:border-amber-500/60 border border-zinc-700/80 text-white hover:text-amber-300 font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-lg active:scale-[0.98]"
      >
        <CreditCard className="w-4 h-4 text-amber-400" />
        <span>Use Amount for Payment</span>
      </button>

      {/* MODALS FOR CURRENCY SELECTION */}
      <CurrencySelectModal
        isOpen={isFromModalOpen}
        onClose={() => setIsFromModalOpen(false)}
        onSelect={(c) => {
          setFromCurrency(c);
          if (c.id === toCurrency.id) {
            // Pick a sensible opposite currency
            if (c.type === 'crypto') {
              setToCurrency(CURRENCY_MAP.USD);
            } else {
              setToCurrency(CURRENCY_MAP.VERSE);
            }
          }
        }}
        selectedCurrencyId={fromCurrency.id}
        title="Select Input Currency (Calculate In)"
        subtitle="The calculator will calculate all math in this currency"
        filterType={calculatorMode === 'crypto' ? 'crypto' : 'all'}
      />

      <CurrencySelectModal
        isOpen={isToModalOpen}
        onClose={() => setIsToModalOpen(false)}
        onSelect={(c) => {
          setToCurrency(c);
          if (c.id === fromCurrency.id) {
            if (c.type === 'crypto') {
              setFromCurrency(CURRENCY_MAP.USD);
            } else {
              setFromCurrency(CURRENCY_MAP.VERSE);
            }
          }
        }}
        selectedCurrencyId={toCurrency.id}
        title="Select Target Currency (Convert To)"
        subtitle="The calculated result will be converted in real-time to this currency"
        filterType={calculatorMode === 'crypto' ? 'all' : 'all'}
      />
    </div>
  );
};
