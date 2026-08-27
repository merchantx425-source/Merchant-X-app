import React from 'react';
import { Delete, Zap, ArrowRight } from 'lucide-react';

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
    <div className="w-full flex flex-col gap-2">
      {/* 4x3 Grid Keypad with thick dark purple edges */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {/* Row 1 */}
        <button
          type="button"
          onClick={() => handleKeyClick('1')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('2')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('3')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          3
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => handleKeyClick('4')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('5')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('6')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          6
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => handleKeyClick('7')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('8')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('9')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          9
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={() => handleKeyClick('.')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold text-zinc-300 shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleKeyClick('0')}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-white shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="keypad-btn h-11 sm:h-12 bg-[#141520] hover:bg-[#1f2130] active:bg-[#282a3d] border-2 sm:border-[2.5px] border-purple-900 hover:border-purple-700 active:border-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-zinc-400 hover:text-red-400 shadow-sm shadow-purple-950/40 cursor-pointer transition-all active:scale-[0.97]"
          title="Delete last digit"
        >
          <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Prominent Charge Button with 100% visible distinct edges on all sides */}
      <div className="w-full pt-1.5 pb-1 px-0.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onChargePress();
          }}
          disabled={isChargeDisabled}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wide uppercase font-display flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg relative overflow-hidden select-none ${
            isChargeDisabled
              ? 'bg-[#181a26] text-zinc-400 border-2 border-zinc-700/80 shadow-md cursor-not-allowed hover:bg-[#1a1c2a]'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black border-2 border-amber-300 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400/40 hover:brightness-110 active:scale-[0.98]'
          }`}
        >
          {!isChargeDisabled && <Zap className="w-5 h-5 fill-current text-black" />}
          <span>{chargeFormattedText}</span>
          {!isChargeDisabled && <ArrowRight className="w-5 h-5 text-black" />}
        </button>
      </div>
    </div>
  );
};
