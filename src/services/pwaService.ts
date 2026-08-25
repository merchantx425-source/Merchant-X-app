/**
 * PWA Service: Service worker registration, install prompt handling, and standalone detection.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY_DISMISSED = 'merchantx_pwa_dismissed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

/**
 * Register the Service Worker
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Log registration
          if (reg.installing) {
            // Service worker installing
          } else if (reg.active) {
            // Service worker active
          }
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }

  // Listen for native beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard mini-infobar or browser banner
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((cb) => cb(true));
  });

  // Listen for when the app is installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((cb) => cb(false));
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'installed');
    } catch {
      // Ignore storage errors
    }
  });
}

/**
 * Check if running in standalone/installed PWA mode
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as any).standalone === true;
  const isAndroidStandalone = document.referrer.includes('android-app://');

  return Boolean(isStandaloneMedia || isIosStandalone || isAndroidStandalone);
}

/**
 * Check if the current device is running iOS (iPhone / iPad / iPod)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if the browser is running on a mobile or tablet device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.innerWidth <= 840;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA || (isSmallScreen && hasTouch);
}

/**
 * Check if user previously dismissed the install prompt
 */
export function isInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY_DISMISSED);
    return val === 'true' || val === 'installed';
  } catch {
    return false;
  }
}

/**
 * Set user dismissal state
 */
export function setInstallDismissed(dismissed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if native install prompt is currently ready
 */
export function canPromptNativeInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Subscribe to install availability changes
 */
export function subscribeInstallState(callback: (canInstall: boolean) => void) {
  installListeners.add(callback);
  callback(deferredPrompt !== null);

  return () => {
    installListeners.delete(callback);
  };
}

/**
 * Trigger native PWA installation prompt
 */
export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    return 'unavailable';
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((cb) => cb(false));
    return choiceResult.outcome;
  } catch (err) {
    console.warn('[PWA] Error triggering install prompt:', err);
    deferredPrompt = null;
    return 'unavailable';
  }
}
