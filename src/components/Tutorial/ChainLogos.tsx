import React from 'react';
import { VerseLogo } from '../VerseLogo';

export interface ChainInfo {
  id: string;
  name: string;
  symbol: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isPopular?: boolean;
}

export const ALL_CHAINS: ChainInfo[] = [
  { id: 'verse', name: 'Verse', symbol: 'VERSE', color: '#00D1FF', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', isPopular: true },
  { id: 'polygon', name: 'Polygon', symbol: 'POL', color: '#8247E5', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', isPopular: true },
  { id: 'usdt', name: 'Tether USD', symbol: 'USDT', color: '#26A17B', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', isPopular: true },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', color: '#2775CA', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', isPopular: true },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627EEA', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', isPopular: true },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', isPopular: true },
];

export const ChainLogo: React.FC<{ chainId: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }> = ({
  chainId,
  size = 'md',
  className = '',
}) => {
  const dimClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  const dim = dimClasses[size];

  switch (chainId.toLowerCase()) {
    case 'verse':
      return <VerseLogo size={size} className={`${className} shrink-0`} />;

    case 'polygon':
    case 'pol':
    case 'matic':
      return (
        <svg viewBox="0 0 32 32" className={`${dim} ${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path
            d="M21.13 13.56c-.6-.35-1.35-.35-1.95 0l-2.4 1.39-1.6 1.2-3.18-2.39 5.58-3.23a2.27 2.27 0 0 0 1.14-1.97V5.72L16 4.1 8.87 8.23v5.6c0 .81.44 1.56 1.14 1.97l2.4 1.39 1.6-1.2 3.18 2.39-5.58 3.23a2.27 2.27 0 0 0-1.14 1.97v2.84L16 27.9l7.13-4.13v-5.6c0-.81-.44-1.56-1.14-1.97l-2.4-1.39 1.54-1.25z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'usdt':
    case 'tether':
      return (
        <svg viewBox="0 0 32 32" className={`${dim} ${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            d="M17.922 17.383c-.11.008-.677.04-1.942.04-1.042 0-1.727-.032-1.898-.04-4.341-.186-7.592-1.008-7.592-1.99 0-.983 3.251-1.805 7.592-1.991v3.17c.174.01.867.042 1.916.042 1.248 0 1.815-.034 1.924-.042v-3.17c4.332.186 7.575 1.008 7.575 1.991 0 .982-3.243 1.804-7.575 1.99zm0-4.321V10.22h4.898V6.833H9.138v3.387h4.886v2.842c-4.912.222-8.614 1.258-8.614 2.508 0 1.25 3.702 2.286 8.614 2.508v8.092h3.898v-8.092c4.904-.222 8.596-1.258 8.596-2.508 0-1.25-3.692-2.286-8.596-2.508z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'usdc':
      return (
        <svg viewBox="0 0 32 32" className={`${dim} ${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <circle cx="16" cy="16" r="11" stroke="#FFFFFF" strokeWidth="1.8" opacity="0.3" fill="none" />
          <path
            d="M16.9 14.2c-1.4-.2-1.9-.5-1.9-1.1 0-.6.5-1 1.5-1 1 0 1.7.3 2.3.8l1.1-1.2c-.8-.7-1.8-1-2.9-1.1V9h-1.8v1.6c-1.6.2-2.7 1.3-2.7 2.7 0 1.7 1.3 2.3 2.9 2.6 1.5.3 1.9.6 1.9 1.2 0 .7-.6 1.1-1.6 1.1-1.2 0-2-.4-2.7-1.1l-1.2 1.2c.9.9 2.1 1.4 3.4 1.5V21h1.8v-1.6c1.7-.2 2.8-1.3 2.8-2.8 0-1.7-1.2-2.2-2.6-2.4z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'ethereum':
    case 'eth':
      return (
        <svg viewBox="0 0 32 32" className={`${dim} ${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
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

    case 'bitcoin':
    case 'btc':
      return (
        <svg viewBox="0 0 32 32" className={`${dim} ${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.745-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057-.058-.014-.12-.03-.183-.045l-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.214 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.535 2.146-4.148.986-5.318.695l.95-3.805c1.17.292 4.922.87 4.368 3.11zm.535-5.567c-.488 1.954-3.495.962-4.47.719l.86-3.45c.974.243 4.116.697 3.61 2.731z"
            fill="#FFFFFF"
          />
        </svg>
      );

    default:
      return (
        <div className={`${dim} rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 ${className}`}>
          {chainId.slice(0, 4).toUpperCase()}
        </div>
      );
  }
};
