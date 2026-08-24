import React from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  onClearPress: () => void;
  onChargePress: () => void;
  chargeFormattedText: string;
  isChargeDisabled: boolean;
  hapticEnabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDigitPress,
  onDeletePress,
  onClearPress,
  onChargePress,
  chargeFormattedText,
  isChargeDisabled,
  hapticEnabled = true,
}) => {
  const triggerHaptic = () => {
    if (hapticEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if restricted
      }
    }
  };

  const handleKeyClick = (val: string) => {
    triggerHaptic();
    onDigitPress(val);
  };

  const handleDelete = () => {
    triggerHaptic();
    onDeletePress();
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* 4x3 Grid Keypad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Row 1 */}
        <button
          type="button"
          onClick={() => handleKeyClick('1')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('2')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('3')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          3
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => handleKeyClick('4')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('5')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('6')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          6
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => handleKeyClick('7')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('8')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('9')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          9
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={() => handleKeyClick('.')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-zinc-300 shadow-sm cursor-pointer"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('0')}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display text-white shadow-sm cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="keypad-btn h-14 sm:h-16 bg-[#161820] hover:bg-[#1f222d] active:bg-[#282c3a] border border-zinc-800/80 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-red-400 shadow-sm cursor-pointer"
          title="Delete last digit"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Dynamic Primary Charge Button */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onChargePress();
        }}
        disabled={isChargeDisabled}
        className={`w-full py-4 sm:py-4.5 px-6 rounded-2xl font-bold text-base sm:text-lg tracking-wide uppercase font-display flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg ${
          isChargeDisabled
            ? 'bg-zinc-800/70 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black hover:brightness-110 active:scale-[0.98] shadow-amber-500/25 border border-amber-300/40'
        }`}
      >
        <span>{chargeFormattedText}</span>
      </button>
    </div>
  );
};
