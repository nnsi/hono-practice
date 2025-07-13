const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

let cachedKey: CryptoKey | null = null;
let cachedUserId: string | null = null;

async function getDerivedKey(userId?: string): Promise<CryptoKey> {
  // ユーザーIDが変わった場合はキャッシュをクリア
  if (userId && userId !== cachedUserId) {
    cachedKey = null;
    cachedUserId = userId;
  }

  if (cachedKey) {
    return cachedKey;
  }

  // ユーザーIDとランダムな値を組み合わせて鍵を生成
  // ユーザーIDが無い場合（未ログイン時）はデバイス固有の値を使用
  const userComponent = userId || getDeviceId();
  const baseKey = `actiko-sync-${userComponent}`;

  // ユーザーごとに異なるsaltを生成（ユーザーIDまたはデバイスIDから導出）
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

// デバイス固有のIDを生成・取得
function getDeviceId(): string {
  const DEVICE_ID_KEY = "actiko-device-id";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // crypto.randomUUID()を使用してデバイス固有のIDを生成
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function encryptData(
  data: string,
  userId?: string,
): Promise<string> {
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

    // IVと暗号化データを結合
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Base64エンコード（大きなデータでも安全に処理）
    let binaryString = "";
    const chunkSize = 8192; // 8KB chunks
    for (let i = 0; i < combined.length; i += chunkSize) {
      const chunk = combined.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const result = btoa(binaryString);
    return result;
  } catch (error) {
    // 暗号化に失敗した場合は平文を返す（後方互換性のため）
    return data;
  }
}

export async function decryptData(
  encryptedData: string,
  userId?: string,
): Promise<string> {
  try {
    // Base64デコード（大きなデータでも安全に処理）
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    // IVと暗号化データを分離
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
    // 復号化に失敗した場合は元のデータを返す（後方互換性のため）
    return encryptedData;
  }
}

export function isEncrypted(data: string): boolean {
  try {
    // Base64形式かつ最小長を満たしているかチェック
    const decoded = atob(data);
    return decoded.length >= IV_LENGTH;
  } catch {
    return false;
  }
}

// キャッシュをクリアする関数
export function clearCryptoCache(): void {
  cachedKey = null;
  cachedUserId = null;
}

export const syncCrypto = {
  encrypt: encryptData,
  decrypt: decryptData,
  isEncrypted,
  clearCache: clearCryptoCache,
};
