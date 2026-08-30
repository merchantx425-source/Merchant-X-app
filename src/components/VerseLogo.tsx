import React from 'react';

interface VerseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
}

export const VerseLogo: React.FC<VerseLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16',
    hero: 'w-24 h-24',
  };

  const dim = sizeMap[size];

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${dim} ${className} shrink-0 drop-shadow-md`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Exact Multi-stop Vibrant Verse Radial Gradient */}
        <linearGradient id="verseCircleGradient" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="28%" stopColor="#0072FF" />
          <stop offset="62%" stopColor="#7000FF" />
          <stop offset="85%" stopColor="#E000B0" />
          <stop offset="100%" stopColor="#FF007F" />
        </linearGradient>

        {/* Soft Translucent Shadow / Fold Gradient for the Right Ribbon Arm */}
        <linearGradient id="verseRightArmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#F5D0FE" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#E879F9" stopOpacity="0.75" />
        </linearGradient>

        {/* Inner subtle glow */}
        <filter id="verseSoftGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7000FF" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Main Gradient Circle Background */}
      <circle cx="100" cy="100" r="96" fill="url(#verseCircleGradient)" filter="url(#verseSoftGlow)" />

      {/* Stylized White Folded Ribbon 'V' */}
      <g transform="translate(100, 104) scale(0.92) translate(-100, -100)">
        {/* Left Pill Arm (Pure Solid Crisp White) */}
        <rect
          x="52"
          y="56"
          width="36"
          height="88"
          rx="18"
          transform="rotate(-34 70 100)"
          fill="#FFFFFF"
        />

        {/* Right Folded Ribbon Arm with subtle depth gradient & soft lavender translucency */}
        <rect
          x="112"
          y="56"
          width="36"
          height="88"
          rx="18"
          transform="rotate(34 130 100)"
          fill="url(#verseRightArmGradient)"
        />
      </g>
    </svg>
  );
};
