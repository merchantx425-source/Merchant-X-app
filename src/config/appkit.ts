/**
 * Safe WalletConnect & Reown AppKit Configuration Module
 * 
 * ZERO TOP-LEVEL HEAVY IMPORTS:
 * All WalletConnect / Reown AppKit SDKs are loaded dynamically only when the user
 * explicitly clicks "Open Official AppKit Modal" or connects.
 * This guarantees the POS Terminal UI and Preview NEVER crash on startup.
 */

// Safe browser environment polyfills for Web3 libraries if needed
if (typeof window !== 'undefined') {
  if (!(window as any).global) {
    (window as any).global = window;
  }
}

export const WALLETCONNECT_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '31ef6d708552677094488d29f5846014';

let appKitInstance: any = null;
let isInitializing = false;

export const metadata = {
  name: 'Merchant X',
  description: 'Merchant X Crypto Payment Terminal POS',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://merchantx.io',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

/**
 * Safely initialize AppKit instance on-demand only
 */
export async function getSafeAppKit(): Promise<any> {
  if (appKitInstance) return appKitInstance;
  if (isInitializing) return null;

  isInitializing = true;

  try {
    // Dynamic import to isolate from initial bundle/render
    const [{ createAppKit }, { WagmiAdapter }, { mainnet, polygon }] = await Promise.all([
      import('@reown/appkit/react'),
      import('@reown/appkit-adapter-wagmi'),
      import('@reown/appkit/networks'),
    ]);

    const adapters: any[] = [];
    const networks: any[] = [mainnet, polygon];

    try {
      const wagmiAdapter = new WagmiAdapter({
        projectId: WALLETCONNECT_PROJECT_ID,
        networks: [mainnet, polygon],
      });
      adapters.push(wagmiAdapter);
    } catch (wagmiErr) {
      console.warn('[Merchant X] Wagmi adapter init warning:', wagmiErr);
    }

    // Try Bitcoin Adapter dynamically and safely isolated
    try {
      const [{ BitcoinAdapter }, { bitcoin }] = await Promise.all([
        import('@reown/appkit-adapter-bitcoin'),
        import('@reown/appkit/networks'),
      ]);
      const bitcoinAdapter = new BitcoinAdapter({
        projectId: WALLETCONNECT_PROJECT_ID,
      });
      adapters.push(bitcoinAdapter);
      networks.push(bitcoin);
    } catch (btcErr) {
      console.warn('[Merchant X] Bitcoin adapter isolated notice:', btcErr);
    }

    if (createAppKit && adapters.length > 0) {
      appKitInstance = createAppKit({
        adapters,
        networks: networks as any,
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata,
        themeMode: 'dark',
        features: {
          analytics: false,
          email: false,
          socials: false,
        },
        themeVariables: {
          '--w3m-accent': '#f59e0b',
          '--w3m-color-mix': '#111319',
          '--w3m-color-mix-strength': 40,
          '--w3m-border-radius-master': '16px',
          '--w3m-z-index': 99999,
        },
      });
    }
  } catch (err) {
    console.warn('[Merchant X] AppKit on-demand init notice:', err);
  } finally {
    isInitializing = false;
  }

  return appKitInstance;
}

/**
 * Safe function to open official WalletConnect modal on demand
 */
export async function openWalletModal(): Promise<{ success: boolean; error?: string }> {
  try {
    const kit = await getSafeAppKit();
    if (kit && typeof kit.open === 'function') {
      await kit.open();
      return { success: true };
    }
    return {
      success: false,
      error: 'WalletConnect modal could not be initialized in this environment. You can enter receiving addresses directly.',
    };
  } catch (err: any) {
    console.warn('[Merchant X] openWalletModal error:', err);
    return { success: false, error: err?.message || 'Failed to open wallet modal' };
  }
}

/**
 * Safe disconnect
 */
export async function disconnectWalletKit(): Promise<void> {
  try {
    if (appKitInstance && typeof appKitInstance.disconnect === 'function') {
      await appKitInstance.disconnect();
    }
  } catch (err) {
    console.warn('[Merchant X] Disconnect warning:', err);
  }
}
