// Cloudflare Workers環境では Web Crypto API を使用

export type ApiKey = {
  id: string;
  userId: string;
  key: string;
  name: string;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateApiKeyData = {
  userId: string;
  name: string;
};

export type UpdateApiKeyData = {
  lastUsedAt?: Date;
  isActive?: boolean;
};

export const generateApiKey = (): string => {
  // API キーの形式: api_xxx_yyy
  // xxx: ランダムな8文字
  // yyy: ランダムな32文字

  // Cloudflare Workers対応: Web Crypto APIを使用
  const randomBytes = new Uint8Array(20); // 4 + 16 bytes
  crypto.getRandomValues(randomBytes);

  // バイト配列を16進数文字列に変換
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  const prefix = toHex(randomBytes.slice(0, 4));
  const suffix = toHex(randomBytes.slice(4, 20));
  return `api_${prefix}_${suffix}`;
};

export const maskApiKey = (key: string): string => {
  // APIキーの最初の部分と最後の4文字のみを表示
  if (key.length <= 20) {
    return `${key.substring(0, 10)}...`;
  }
  return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
};

export const hashApiKey = async (key: string): Promise<string> => {
  // SHA256でAPIキーをハッシュ化
  // Cloudflare Workers対応: Web Crypto APIを使用
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // ArrayBufferを16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};
