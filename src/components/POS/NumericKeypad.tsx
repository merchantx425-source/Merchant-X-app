import React, { useCallback } from 'react';
import { Delete } from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';

interface NumericKeypadProps {
  rawAmount: string;
  onAmountChange: (newAmount: string) => void;
  onClear: () => void;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  rawAmount,
  onAmountChange,
  onClear,
}) => {
  const { settings } = useMerchant();

  // Play subtle haptic feedback or audio click if enabled
  const triggerFeedback = useCallback(() => {
    if (settings.hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  }, [settings.hapticEnabled]);

  const handleKeyPress = (val: string) => {
    triggerFeedback();

    if (val === 'DELETE') {
      if (rawAmount.length <= 1) {
        onAmountChange('');
      } else {
        onAmountChange(rawAmount.slice(0, -1));
      }
      return;
    }

    if (val === '.') {
      if (rawAmount.includes('.')) return; // Don't allow multiple decimals
      if (rawAmount === '') {
        onAmountChange('0.');
      } else {
        onAmountChange(rawAmount + '.');
      }
      return;
    }

    // Decimal precision guard: limit to 2 decimal places
    if (rawAmount.includes('.')) {
      const parts = rawAmount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }

    // Max amount length guard (e.g. 10 digits before decimals)
    if (!rawAmount.includes('.') && rawAmount.length >= 10) return;

    // Handle leading zero
    if (rawAmount === '0') {
      if (val === '0') return;
      onAmountChange(val);
      return;
    }

    onAmountChange(rawAmount + val);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'DELETE'],
  ];

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-3 p-1 sm:gap-3.5">
      {keys.flat().map((key) => {
        const isDelete = key === 'DELETE';
        const isDot = key === '.';

        return (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            aria-label={isDelete ? 'Delete last digit' : `Digit ${key}`}
            className={`keypad-btn h-14 sm:h-16 rounded-2xl flex items-center justify-center font-['JetBrains_Mono'] font-bold text-2xl select-none transition-all cursor-pointer shadow-sm active:scale-95 ${
              isDelete
                ? 'bg-[#181b24] hover:bg-[#202533] text-red-400 hover:text-red-300 border border-slate-800/80 active:bg-red-950/40'
                : isDot
                ? 'bg-[#181b24] hover:bg-[#202533] text-white border border-slate-800/80'
                : 'bg-[#161821] hover:bg-[#1f2330] text-white border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {isDelete ? (
              <Delete className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <span>{key}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
