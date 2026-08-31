/**
 * PWA Service: Service worker registration, install prompt handling, standalone detection,
 * and automatic app update detection & notification lifecycle.
 */

export const CURRENT_CLIENT_VERSION = '1.2.0';
const DISMISSED_UPDATE_KEY = 'merchant_x_dismissed_update_v1';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string[];
  isWaitingWorker: boolean;
  lastChecked: number;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let activeRegistration: ServiceWorkerRegistration | null = null;
let waitingWorkerInstance: ServiceWorker | null = null;

const installListeners = new Set<(canInstall: boolean) => void>();
const updateListeners = new Set<(info: AppUpdateInfo) => void>();

let currentUpdateState: AppUpdateInfo = {
  hasUpdate: false,
  currentVersion: CURRENT_CLIENT_VERSION,
  latestVersion: CURRENT_CLIENT_VERSION,
  releaseNotes: [],
  isWaitingWorker: false,
  lastChecked: Date.now(),
};

function notifyUpdateListeners() {
  updateListeners.forEach((listener) => {
    try {
      listener(currentUpdateState);
    } catch (err) {
      console.warn('[PWA] Error in update listener:', err);
    }
  });
}

/**
 * Register the Service Worker & wire update listeners
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          activeRegistration = reg;

          // Check if there's already a waiting service worker
          if (reg.waiting) {
            waitingWorkerInstance = reg.waiting;
            currentUpdateState = {
              ...currentUpdateState,
              hasUpdate: true,
              isWaitingWorker: true,
              lastChecked: Date.now(),
            };
            notifyUpdateListeners();
          }

          // Listen for new service worker installation
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update is ready and waiting to activate
                  waitingWorkerInstance = installingWorker;
                  currentUpdateState = {
                    ...currentUpdateState,
                    hasUpdate: true,
                    isWaitingWorker: true,
                    lastChecked: Date.now(),
                  };
                  notifyUpdateListeners();
                }
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });

      // Reload window when new service worker takes over if update was requested
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Let the update flow handle clean reloads
      });
    });

    // Check for updates whenever user returns to the installed app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForAppUpdates(false);
      }
    });

    window.addEventListener('focus', () => {
      checkForAppUpdates(false);
    });

    // Periodic background check every 15 minutes
    setInterval(() => {
      checkForAppUpdates(false);
    }, 15 * 60 * 1000);
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
  });

  // Initial check on boot
  setTimeout(() => {
    checkForAppUpdates(false);
  }, 3500);
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

/**
 * Subscribe to app update state changes
 */
export function subscribeAppUpdate(callback: (info: AppUpdateInfo) => void) {
  updateListeners.add(callback);
  callback(currentUpdateState);

  return () => {
    updateListeners.delete(callback);
  };
}

/**
 * Get current App Update State synchronously
 */
export function getAppUpdateState(): AppUpdateInfo {
  return currentUpdateState;
}

/**
 * Check for newer updates from the service worker and version endpoint
 */
export async function checkForAppUpdates(isManual = false): Promise<AppUpdateInfo> {
  const now = Date.now();

  try {
    // 1. Ask active service worker registration to query the network for updated sw.js
    if (activeRegistration) {
      try {
        await activeRegistration.update();
        if (activeRegistration.waiting) {
          waitingWorkerInstance = activeRegistration.waiting;
          currentUpdateState = {
            ...currentUpdateState,
            hasUpdate: true,
            isWaitingWorker: true,
            lastChecked: now,
          };
          notifyUpdateListeners();
          return currentUpdateState;
        }
      } catch (swErr) {
        console.warn('[PWA] SW update check failed:', swErr);
      }
    }

    // 2. Fetch server app version manifest
    const res = await fetch(`/api/app-version?t=${now}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const serverVersion = data.version || CURRENT_CLIENT_VERSION;
      const releaseNotes = Array.isArray(data.releaseNotes) ? data.releaseNotes : [];

      // Compare versions (semver style check or string mismatch)
      const hasNewVersion = isVersionNewer(serverVersion, CURRENT_CLIENT_VERSION);

      currentUpdateState = {
        hasUpdate: hasNewVersion || currentUpdateState.isWaitingWorker,
        currentVersion: CURRENT_CLIENT_VERSION,
        latestVersion: serverVersion,
        releaseNotes: releaseNotes.length > 0 ? releaseNotes : [
          'Automatic Real-time Update Notification for installed devices',
          'Enhanced Underpaid / Overpaid discrepancy engine',
          'Faster blockchain scanning & settlement feedback',
        ],
        isWaitingWorker: !!waitingWorkerInstance,
        lastChecked: now,
      };

      notifyUpdateListeners();
      return currentUpdateState;
    }
  } catch (err) {
    if (isManual) {
      console.warn('[PWA] Manual update check error:', err);
    }
  }

  currentUpdateState = {
    ...currentUpdateState,
    lastChecked: now,
  };
  notifyUpdateListeners();
  return currentUpdateState;
}

/**
 * Helper to compare semantic versions: returns true if v1 is newer than v2
 */
function isVersionNewer(v1: string, v2: string): boolean {
  try {
    const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
  } catch {
    return v1 !== v2;
  }
  return false;
}

/**
 * Apply the update: Tells the waiting service worker to skip waiting,
 * clears static cache caches, and refreshes the application window.
 */
export async function applyAppUpdate(): Promise<void> {
  try {
    if (waitingWorkerInstance) {
      waitingWorkerInstance.postMessage({ type: 'SKIP_WAITING' });
    }

    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (cErr) {
        console.warn('[PWA] Cache purge error:', cErr);
      }
    }

    // Short grace delay then hard reload
    setTimeout(() => {
      window.location.reload();
    }, 250);
  } catch (err) {
    console.error('[PWA] Error applying update, forcing reload:', err);
    window.location.reload();
  }
}

/**
 * Check if the user previously dismissed this specific update version
 */
export function isUpdateDismissed(version: string): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Dismiss the update prompt banner for this specific version session
 */
export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(DISMISSED_UPDATE_KEY, version);
  } catch {
    // Ignore
  }
}


