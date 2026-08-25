import React from 'react';
import { CryptoAsset } from '../types/merchant';

interface CryptoAssetIconProps {
  asset: CryptoAsset;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CryptoAssetIcon: React.FC<CryptoAssetIconProps> = ({
  asset,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const dim = sizeClasses[size];

  switch (asset) {
    case 'VERSE':
      return (
        /* Official Verse Logo constructed with radiant Cyan -> Purple -> Magenta gradient and dual-pill white 'V' */
        <svg
          viewBox="0 0 100 100"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="verse-bg-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#00D2FF" />
              <stop offset="35%" stopColor="#0072FF" />
              <stop offset="65%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#FF007F" />
            </linearGradient>
            <filter id="verse-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8A2BE2" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Gradient Circle */}
          <circle cx="50" cy="50" r="48" fill="url(#verse-bg-gradient)" filter="url(#verse-glow)" />

          {/* Inner Stylized Verse 'V' */}
          <g transform="translate(0, 0)">
            {/* Left White Pill */}
            <rect
              x="26"
              y="32"
              width="18"
              height="40"
              rx="9"
              transform="rotate(-30 35 52)"
              fill="#FFFFFF"
            />
            {/* Right Translucent Glowing Pill Overlapping to create 'V' */}
            <rect
              x="56"
              y="32"
              width="18"
              height="40"
              rx="9"
              transform="rotate(30 65 52)"
              fill="#FFFFFF"
              fillOpacity="0.78"
            />
          </g>
        </svg>
      );

    case 'BTC':
      return (
        <svg
          viewBox="0 0 32 32"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.745-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057-.058-.014-.12-.03-.183-.045l-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.214 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.148.986-5.318.695l.95-3.805c1.17.292 4.922.87 4.368 3.11zm.535-5.567c-.488 1.954-3.495.962-4.47.719l.86-3.45c.974.243 4.116.697 3.61 2.731z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'ETH':
      return (
        <svg
          viewBox="0 0 32 32"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFFFFF" fillRule="nonzero">
            <path opacity="0.6" d="M16 4v8.87l7.5 3.35L16 4z" />
            <path d="M16 4L8.5 16.22l7.5-3.35V4z" />
            <path opacity="0.6" d="M16 21.87v6.13L23.5 17.6 16 21.87z" />
            <path d="M16 28V21.87L8.5 17.6 16 28z" />
            <path opacity="0.2" d="M16 20.57l7.5-4.35L16 12.87v7.7z" />
            <path opacity="0.6" d="M8.5 16.22l7.5 4.35v-7.7l-7.5 3.35z" />
          </g>
        </svg>
      );

    case 'USDT':
      return (
        <svg
          viewBox="0 0 32 32"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            d="M17.922 17.383c-.11.008-.679.04-1.766.04-1.006 0-1.683-.032-1.878-.04-4.22-.19-7.378-.89-7.378-1.734 0-.845 3.158-1.545 7.378-1.735v2.753c.198.014.887.051 1.895.051 1.054 0 1.638-.037 1.749-.051v-2.753c4.215.19 7.37.89 7.37 1.735 0 .844-3.155 1.544-7.37 1.734zm0-3.87v-2.473h5.922V7.5H8.156v3.54h5.932v2.473c-4.733.222-8.277 1.077-8.277 2.103 0 1.026 3.544 1.88 8.277 2.104v7.88h3.791v-7.88c4.728-.223 8.267-1.078 8.267-2.104 0-1.026-3.539-1.88-8.224-2.103z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'USDC':
      return (
        <svg
          viewBox="0 0 32 32"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6zm.8 16.8v1.6h-1.6v-1.6c-2.4-.2-3.8-1.5-3.9-3.2h2.2c.1 1 1 1.6 2.5 1.6 1.4 0 2.2-.6 2.2-1.5 0-.9-.7-1.3-2.4-1.7-2.7-.6-4.1-1.6-4.1-3.5 0-1.8 1.4-3.1 3.5-3.3V9.1h1.6v1.6c2.1.2 3.4 1.4 3.6 2.9h-2.2c-.1-.8-.8-1.3-2.2-1.3-1.3 0-2 .6-2 1.4 0 .8.6 1.2 2.3 1.6 2.8.6 4.2 1.6 4.2 3.6 0 1.9-1.4 3.2-3.8 3.5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'POL':
      return (
        <svg
          viewBox="0 0 32 32"
          className={`${dim} ${className} shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path
            d="M21.2 11.5L16.6 8.8c-.4-.2-.8-.2-1.2 0L10.8 11.5c-.4.2-.6.6-.6 1.1v5.4c0 .4.2.8.6 1.1l4.6 2.7c.4.2.8.2 1.2 0l4.6-2.7c.4-.2.6-.6.6-1.1v-5.4c0-.5-.2-.9-.6-1.1zm-5.2 9.5l-3.8-2.2v-4.5l3.8 2.2v4.5zm1-5.7l-3.8-2.2 3.8-2.2 3.8 2.2-3.8 2.2zm4.8 1.2l-3.8 2.2v-4.5l3.8-2.2v4.5z"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return (
        <div className={`${dim} ${className} rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-white`}>
          {asset}
        </div>
      );
  }
};
