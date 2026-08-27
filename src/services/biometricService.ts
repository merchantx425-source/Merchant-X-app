/**
 * Merchant X Biometric / WebAuthn & Phone Fingerprint Service
 * Supports:
 * - W3C WebAuthn Platform Authenticator (Android Fingerprint, Pixel Imprint, Samsung Pass, Touch ID / Face ID)
 * - Safe Base64URL Credential Storage
 * - Device Haptic Feedback on Touch (navigator.vibrate)
 * - Fallback PIN Code Authentication
 */

const STORAGE_KEYS = {
  CREDENTIAL_ID: 'merchant_x_biometric_cred_id_v2',
  CREDENTIAL_RAW: 'merchant_x_biometric_cred_raw_v2',
  PIN_CODE: 'merchant_x_terminal_pin_v1',
  IS_ENABLED: 'merchant_x_biometric_active_v1',
};

// Utilities for ArrayBuffer <-> Base64URL conversion
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Trigger physical phone vibration / haptic feedback
 */
export function triggerBiometricHaptic(type: 'success' | 'tap' | 'error' | 'scan' = 'tap'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'success') {
        navigator.vibrate([40, 50, 40]);
      } else if (type === 'tap' || type === 'scan') {
        navigator.vibrate(35);
      } else if (type === 'error') {
        navigator.vibrate([80, 50, 80]);
      }
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Check if Biometric / Platform Authenticator is available on the device
 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  platformAuthenticator: boolean;
  type: 'fingerprint' | 'touch_id' | 'passkey' | 'unsupported';
}> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !navigator.credentials ||
    !navigator.credentials.create
  ) {
    return {
      available: false,
      platformAuthenticator: false,
      type: 'unsupported',
    };
  }

  try {
    let platformAuth = false;
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      platformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }

    const ua = navigator.userAgent.toLowerCase();
    let biometricType: 'fingerprint' | 'touch_id' | 'passkey' | 'unsupported' = 'passkey';
    if (ua.includes('android')) {
      biometricType = 'fingerprint';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('macintosh')) {
      biometricType = 'touch_id';
    }

    return {
      available: true,
      platformAuthenticator: platformAuth,
      type: biometricType,
    };
  } catch (e) {
    console.warn('[Biometric] Availability check warning:', e);
    return {
      available: true, // Browser supports basic credentials
      platformAuthenticator: false,
      type: 'fingerprint',
    };
  }
}

/**
 * Register a new Biometric / Fingerprint credential on the phone
 */
export async function registerBiometricPasskey(
  merchantName: string = 'Merchant X Terminal'
): Promise<{ success: boolean; credentialId?: string; isWebAuthn: boolean }> {
  triggerBiometricHaptic('tap');

  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create
  ) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Merchant X POS',
          id: isLocal ? undefined : hostname,
        },
        user: {
          id: userId,
          name: (merchantName || 'Merchant X').toLowerCase().replace(/\s+/g, '-'),
          displayName: merchantName || 'Merchant X Terminal',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (Standard Android Fingerprint / Touch ID)
          { alg: -257, type: 'public-key' }, // RS256
          { alg: -8, type: 'public-key' }, // Ed25519
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Enforces on-device biometric sensor
          userVerification: 'required', // Enforces real biometric sensor prompt
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;

      if (credential) {
        const credId = credential.id || bufferToBase64url(credential.rawId);
        localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credId);
        localStorage.setItem(STORAGE_KEYS.IS_ENABLED, 'true');
        triggerBiometricHaptic('success');
        return { success: true, credentialId: credId, isWebAuthn: true };
      }
    } catch (err: any) {
      console.warn('[Biometric] WebAuthn create notice:', err);
      if (err.name === 'NotAllowedError') {
        throw new Error('Biometric setup was cancelled. Please touch your phone’s fingerprint sensor when prompted.');
      }
      throw new Error(err.message || 'Failed to setup hardware biometric credential.');
    }
  }

  throw new Error('Hardware biometric passkey is not supported on this browser/device.');
}

/**
 * Verify Biometric / Fingerprint Authentication
 * Triggers native phone biometric sensor prompt (Android Fingerprint / Touch ID / Passkey)
 */
export async function verifyBiometricAuth(options?: {
  promptTitle?: string;
  forceWebAuthn?: boolean;
}): Promise<{ success: boolean; method: 'webauthn' | 'pin'; error?: string }> {
  triggerBiometricHaptic('scan');

  // Attempt Native Platform WebAuthn Biometrics
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials
  ) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const savedCredId = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);

      if (savedCredId && navigator.credentials.get) {
        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: isLocal ? undefined : hostname,
          allowCredentials: [
            {
              id: base64urlToBuffer(savedCredId),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
        };

        const assertion = await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        });

        if (assertion) {
          triggerBiometricHaptic('success');
          return { success: true, method: 'webauthn' };
        }
      } else if (navigator.credentials.create) {
        // If credential ID was not cached, register / prompt platform authenticator directly
        const regRes = await registerBiometricPasskey('Merchant Terminal');
        if (regRes.success) {
          triggerBiometricHaptic('success');
          return { success: true, method: 'webauthn' };
        }
      }
    } catch (err: any) {
      console.warn('[Biometric] WebAuthn verify prompt notice:', err);
      if (err.name === 'NotAllowedError') {
        throw new Error('Biometric verification cancelled. Please touch your phone’s fingerprint sensor again or enter your PIN.');
      }
      throw new Error(err.message || 'Fingerprint verification failed. Please try again or use your PIN.');
    }
  }

  throw new Error('Hardware biometric sensor is not available on this browser. Please use your PIN code.');
}

/**
 * Terminal Biometric & PIN status helpers
 */
export function isBiometricEnabledState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check settings JSON as single source of truth
    const settingsRaw = localStorage.getItem('merchant_x_settings_v1');
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      return parsed?.biometricEnabled === true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export function setBiometricEnabledState(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(STORAGE_KEYS.IS_ENABLED, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.IS_ENABLED);
    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_RAW);
  }
}

export function hasStoredTerminalPin(): boolean {
  if (typeof window === 'undefined') return false;
  const pin = localStorage.getItem(STORAGE_KEYS.PIN_CODE);
  return typeof pin === 'string' && pin.trim().length >= 4;
}

export function getStoredTerminalPin(): string | null {
  if (typeof window === 'undefined') return null;
  const pin = localStorage.getItem(STORAGE_KEYS.PIN_CODE);
  if (!pin || pin.trim().length < 4) return null;
  return pin.trim();
}

export function setStoredTerminalPin(pin: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = pin ? pin.trim() : '';
  if (!cleaned || cleaned.length < 4) {
    localStorage.removeItem(STORAGE_KEYS.PIN_CODE);
  } else {
    localStorage.setItem(STORAGE_KEYS.PIN_CODE, cleaned);
  }
}

export function verifyTerminalPin(enteredPin: string): boolean {
  const stored = getStoredTerminalPin();
  if (!stored) return true; // No PIN configured
  return stored === enteredPin.trim();
}
