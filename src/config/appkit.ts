/**
 * Official WalletConnect & Reown AppKit Configuration Module
 * 
 * Configures EVM (Polygon, Ethereum) and Bitcoin adapters.
 * Subscribes to real-time wallet connections so that upon approval,
 * the Merchant X terminal immediately shows "Connected ✓" and loads balances.
 */

// Browser polyfills for Web3 libraries if needed
if (typeof window !== 'undefined') {
  if (!(window as any).global) {
    (window as any).global = window;
  }
}

export const WALLETCONNECT_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || '31ef6d708552677094488d29f5846014';

let appKitInstance: any = null;
let isInitializing = false;
let accountChangeCallbacks: Array<(account: { address: string | null; caipAddress?: string; isConnected: boolean }) => void> = [];

export const metadata = {
  name: 'Merchant X',
  description: 'Merchant X Multichain Crypto Merchant POS Terminal',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://merchantx.io',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

/**
 * Register a listener for wallet account changes
 */
export function onAppKitAccountChange(cb: (account: { address: string | null; caipAddress?: string; isConnected: boolean }) => void) {
  accountChangeCallbacks.push(cb);
  return () => {
    accountChangeCallbacks = accountChangeCallbacks.filter((c) => c !== cb);
  };
}

function notifyAccountChange(account: { address: string | null; caipAddress?: string; isConnected: boolean }) {
  for (const cb of accountChangeCallbacks) {
    try {
      cb(account);
    } catch (e) {
      console.warn('Error in account change callback:', e);
    }
  }
}

/**
 * Safely initialize AppKit instance on-demand or in background
 */
export async function getSafeAppKit(): Promise<any> {
  if (appKitInstance) return appKitInstance;
  if (isInitializing) {
    // Wait for in-flight initialization
    let count = 0;
    while (isInitializing && count < 20) {
      await new Promise((r) => setTimeout(r, 100));
      count++;
    }
    if (appKitInstance) return appKitInstance;
  }

  isInitializing = true;

  try {
    const [{ createAppKit }, { WagmiAdapter }, { BitcoinAdapter }, { mainnet, polygon, bitcoin }] = await Promise.all([
      import('@reown/appkit/react'),
      import('@reown/appkit-adapter-wagmi'),
      import('@reown/appkit-adapter-bitcoin'),
      import('@reown/appkit/networks'),
    ]);

    const adapters: any[] = [];
    const networks: any[] = [mainnet, polygon, bitcoin];

    try {
      const wagmiAdapter = new WagmiAdapter({
        projectId: WALLETCONNECT_PROJECT_ID,
        networks: [mainnet, polygon],
      });
      adapters.push(wagmiAdapter);
    } catch (wagmiErr) {
      console.warn('[Merchant X] Wagmi adapter init notice:', wagmiErr);
    }

    try {
      const bitcoinAdapter = new BitcoinAdapter({
        projectId: WALLETCONNECT_PROJECT_ID,
      });
      adapters.push(bitcoinAdapter);
    } catch (btcErr) {
      console.warn('[Merchant X] Bitcoin adapter init notice:', btcErr);
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

      // Subscribe to real-time account state changes
      if (typeof appKitInstance.subscribeAccount === 'function') {
        appKitInstance.subscribeAccount((account: any) => {
          if (account) {
            notifyAccountChange({
              address: account.address || null,
              caipAddress: account.caipAddress,
              isConnected: !!account.isConnected && !!account.address,
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Merchant X] AppKit initialization notice:', err);
  } finally {
    isInitializing = false;
  }

  return appKitInstance;
}

/**
 * Preload AppKit in background so clicks open instantly
 */
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getSafeAppKit().catch(() => {});
  }, 1000);
}

/**
 * Safe function to open official WalletConnect modal
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
      error: 'Wallet connection unavailable.',
    };
  } catch (err: any) {
    console.warn('[Merchant X] openWalletModal error:', err);
    return { success: false, error: 'Wallet connection unavailable.' };
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
