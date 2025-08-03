import type { CryptoProvider } from "./types";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

export type CryptoProviderConfig = {
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  deviceIdKey?: string;
};

/**
 * Create a crypto provider for encryption/decryption
 */
export function createCryptoProvider(
  config?: CryptoProviderConfig,
): CryptoProvider {
  const storage = config?.storage || {
    getItem: (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    },
    setItem: (key: string, value: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    },
  };
  const DEVICE_ID_KEY = config?.deviceIdKey || "actiko-device-id";

  let cachedKey: CryptoKey | null = null;
  let cachedUserId: string | null = null;

  async function getDerivedKey(userId?: string): Promise<CryptoKey> {
    // Clear cache if user changed
    if (userId && userId !== cachedUserId) {
      cachedKey = null;
      cachedUserId = userId;
    }

    if (cachedKey) {
      return cachedKey;
    }

    // Generate key from user ID and random value
    // Use device-specific value if no user ID (not logged in)
    const userComponent = userId || getDeviceId();
    const baseKey = `actiko-sync-${userComponent}`;

    // Generate different salt per user (derived from user ID or device ID)
    const saltSource = `actiko-salt-${userComponent}`;
    const saltHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(saltSource),
    );
    const salt = new Uint8Array(saltHash).slice(0, SALT_LENGTH);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(baseKey),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"],
    );

    cachedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );

    return cachedKey;
  }

  // Get or generate device-specific ID
  function getDeviceId(): string {
    let deviceId = storage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate device-specific ID using crypto.randomUUID()
      deviceId = crypto.randomUUID();
      storage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  }

  async function encryptData(data: string, userId?: string): Promise<string> {
    try {
      const key = await getDerivedKey(userId);
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const encodedData = new TextEncoder().encode(data);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: ALGORITHM,
          iv,
        },
        key,
        encodedData,
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Base64 encode (safely process large data)
      let binaryString = "";
      const chunkSize = 8192; // 8KB chunks
      for (let i = 0; i < combined.length; i += chunkSize) {
        const chunk = combined.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const result = btoa(binaryString);
      return result;
    } catch (error) {
      // Return plain text if encryption fails (for backward compatibility)
      return data;
    }
  }

  async function decryptData(
    encryptedData: string,
    userId?: string,
  ): Promise<string> {
    try {
      // Base64 decode (safely process large data)
      const binaryString = atob(encryptedData);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }

      // Separate IV and encrypted data
      const iv = combined.slice(0, IV_LENGTH);
      const data = combined.slice(IV_LENGTH);

      const key = await getDerivedKey(userId);
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv,
        },
        key,
        data,
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      // Return original data if decryption fails (for backward compatibility)
      return encryptedData;
    }
  }

  function isEncrypted(data: string): boolean {
    try {
      // Check if it's base64 and meets minimum length
      const decoded = atob(data);
      return decoded.length >= IV_LENGTH;
    } catch {
      return false;
    }
  }

  // Clear cache function
  function clearCryptoCache(): void {
    cachedKey = null;
    cachedUserId = null;
  }

  return {
    encrypt: encryptData,
    decrypt: decryptData,
    isEncrypted,
    clearCache: clearCryptoCache,
  };
}
