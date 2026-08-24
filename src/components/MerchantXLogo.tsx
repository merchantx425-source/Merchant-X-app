import React from 'react';

interface MerchantXLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  className?: string;
  glow?: boolean;
  animated?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
  hero: 'w-40 h-40 md:w-48 md:h-48',
};

export const MerchantXLogo: React.FC<MerchantXLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
  animated = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${sizeMap[size]} ${className} ${
        animated ? 'transition-transform duration-700 ease-out' : ''
      }`}
    >
      {glow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 via-blue-600/20 to-amber-300/30 blur-xl animate-pulse-glow pointer-events-none" />
      )}

      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain filter drop-shadow-md"
      >
        <defs>
          {/* Blue M Gradients */}
          <linearGradient id="mBlueLeft" x1="60" y1="120" x2="160" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="50%" stopColor="#142c4b" />
            <stop offset="100%" stopColor="#0a1728" />
          </linearGradient>

          <linearGradient id="mBlueLeftBevel" x1="50" y1="110" x2="100" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b6999" />
            <stop offset="40%" stopColor="#224872" />
            <stop offset="100%" stopColor="#0d1f35" />
          </linearGradient>

          <linearGradient id="mBlueRight" x1="240" y1="120" x2="340" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#254770" />
            <stop offset="50%" stopColor="#163152" />
            <stop offset="100%" stopColor="#0b1a2d" />
          </linearGradient>

          <linearGradient id="mBlueRightBevel" x1="280" y1="110" x2="350" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4377ae" />
            <stop offset="60%" stopColor="#1d3d63" />
            <stop offset="100%" stopColor="#0b1726" />
          </linearGradient>

          {/* Gold X Gradients */}
          <linearGradient id="goldBeamMain" x1="120" y1="110" x2="320" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f7e1a0" />
            <stop offset="25%" stopColor="#dfb75c" />
            <stop offset="60%" stopColor="#a47728" />
            <stop offset="85%" stopColor="#cfa54c" />
            <stop offset="100%" stopColor="#7a5418" />
          </linearGradient>

          <linearGradient id="goldBeamBevel" x1="100" y1="90" x2="350" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff8e1" />
            <stop offset="30%" stopColor="#f3d282" />
            <stop offset="70%" stopColor="#9b6f20" />
            <stop offset="100%" stopColor="#573a0e" />
          </linearGradient>

          <linearGradient id="goldSlash" x1="390" y1="70" x2="130" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fffae6" />
            <stop offset="20%" stopColor="#ebd07e" />
            <stop offset="55%" stopColor="#a77a28" />
            <stop offset="80%" stopColor="#c89f46" />
            <stop offset="100%" stopColor="#6c4811" />
          </linearGradient>

          <linearGradient id="goldGleam" x1="390" y1="75" x2="260" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#e8c777" />
            <stop offset="100%" stopColor="#966d1f" />
          </linearGradient>

          {/* Filters for subtle depth */}
          <filter id="subtleBevel" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* -------------------- M LEFT PILLAR & SLANT -------------------- */}
        {/* Outer Bevel Shadow Left */}
        <polygon
          points="70,115 125,115 125,320 100,320 70,290"
          fill="url(#mBlueLeftBevel)"
        />
        {/* Left Vertical Bar */}
        <polygon
          points="80,120 120,120 120,320 80,320"
          fill="url(#mBlueLeft)"
        />
        {/* Inner Left Bevel Cut */}
        <polygon
          points="80,120 95,145 95,300 80,320"
          fill="#315c8c"
          opacity="0.8"
        />
        
        {/* Left Diagonal Down */}
        <polygon
          points="120,120 165,120 200,215 170,215"
          fill="url(#mBlueLeft)"
        />
        <polygon
          points="120,120 135,120 185,215 170,215"
          fill="#254a73"
        />

        {/* -------------------- M RIGHT PILLAR & SLANT -------------------- */}
        {/* Right Vertical Bar */}
        <polygon
          points="280,120 320,120 320,320 280,320"
          fill="url(#mBlueRight)"
        />
        {/* Outer Bevel Shadow Right */}
        <polygon
          points="280,120 320,120 335,140 335,300 320,320 280,320"
          fill="url(#mBlueRightBevel)"
        />
        <polygon
          points="305,125 320,120 320,320 305,300"
          fill="#142c4b"
          opacity="0.9"
        />

        {/* Right Diagonal Down */}
        <polygon
          points="235,120 280,120 230,215 200,215"
          fill="url(#mBlueRight)"
        />
        <polygon
          points="265,120 280,120 230,215 215,215"
          fill="#2a5280"
        />

        {/* M Central Corner Bottom */}
        <polygon
          points="170,215 200,285 230,215 200,215"
          fill="#0c1d32"
        />

        {/* -------------------- INTERTWINED GOLD X -------------------- */}
        {/* Gold Downward Slash (Top-Left to Bottom-Right) */}
        <polygon
          points="130,115 180,115 320,320 270,320"
          fill="url(#goldBeamMain)"
          filter="url(#subtleBevel)"
        />
        {/* Top-Left to Bottom-Right Bevel Facet */}
        <polygon
          points="130,115 155,115 295,320 270,320"
          fill="url(#goldBeamBevel)"
        />

        {/* Gold Upward Slash with the Iconic Extended Razor Needle Tip (Bottom-Left to Top-Right) */}
        {/* Main Blade */}
        <polygon
          points="130,320 180,320 395,78 350,115 290,115"
          fill="url(#goldSlash)"
          filter="url(#subtleBevel)"
        />
        {/* Upper Needle Tip & Bevel Ridge */}
        <polygon
          points="290,115 350,115 395,78 340,145"
          fill="url(#goldGleam)"
        />
        {/* Bottom-Left to Center Ridge */}
        <polygon
          points="130,320 155,320 275,175 250,175"
          fill="#fff3cf"
          opacity="0.6"
        />
        {/* Lower Shade Edge */}
        <polygon
          points="155,320 180,320 295,185 275,185"
          fill="#6d4814"
        />

        {/* Central Crossing Jewel Highlight */}
        <polygon
          points="190,205 210,185 230,205 210,225"
          fill="#fffbe8"
          opacity="0.4"
        />

        {/* Sharp Needle Apex Glint */}
        <circle cx="395" cy="78" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};
