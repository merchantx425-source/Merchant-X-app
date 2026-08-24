import React from 'react';
import { SUPPORTED_FIAT } from '../../config/constants';
import { FiatCurrency } from '../../types/merchant';
import { Zap } from 'lucide-react';

interface ChargeButtonProps {
  amount: number;
  formattedAmountString: string;
  fiatCurrency: FiatCurrency;
  onCharge: () => void;
  disabled?: boolean;
}

export const ChargeButton: React.FC<ChargeButtonProps> = ({
  amount,
  formattedAmountString,
  fiatCurrency,
  onCharge,
  disabled = false,
}) => {
  const fiatConfig = SUPPORTED_FIAT[fiatCurrency] || SUPPORTED_FIAT.NGN;
  const isZero = amount <= 0;

  const displayLabel = isZero
    ? `CHARGE ${fiatConfig.symbol}0`
    : `CHARGE ${fiatConfig.symbol}${formattedAmountString}`;

  return (
    <div className="w-full max-w-sm mx-auto mt-3 px-1">
      <button
        type="button"
        onClick={onCharge}
        disabled={isZero || disabled}
        className={`w-full h-14 sm:h-16 rounded-2xl flex items-center justify-center gap-2 font-['Outfit'] font-extrabold text-lg sm:text-xl tracking-wide select-none transition-all cursor-pointer shadow-lg ${
          isZero || disabled
            ? 'bg-[#2a2219] text-amber-500/40 border border-amber-900/30 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-[#ff6b00] via-[#ff8800] to-[#ffa000] text-white hover:brightness-110 active:scale-[0.98] shadow-[0_4px_20px_rgba(255,122,0,0.35)] border border-amber-400/40'
        }`}
      >
        <Zap className={`w-5 h-5 ${isZero ? 'opacity-40' : 'text-amber-200 fill-amber-200 animate-bounce'}`} />
        <span className="truncate">{displayLabel}</span>
      </button>
    </div>
  );
};
