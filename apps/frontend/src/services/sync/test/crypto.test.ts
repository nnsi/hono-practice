import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCryptoProvider } from "../crypto";

import type { CryptoProvider } from "../types";
import type { StorageProvider } from "@frontend/services/abstractions";

// Web Crypto APIのモック
const mockCrypto = {
  subtle: {
    digest: vi.fn(),
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  randomUUID: vi.fn(() => "mock-uuid-12345"),
  getRandomValues: vi.fn((array: Uint8Array) => {
    // テスト用の擬似ランダム値を設定
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  }),
};

// グローバルcryptoのモック（Node.js環境）
vi.stubGlobal("crypto", mockCrypto);

// Base64関数のモック
vi.stubGlobal("btoa", (str: string) =>
  Buffer.from(str, "binary").toString("base64"),
);
vi.stubGlobal("atob", (str: string) =>
  Buffer.from(str, "base64").toString("binary"),
);

describe("crypto", () => {
  let cryptoProvider: CryptoProvider;
  let storage: StorageProvider;

  beforeEach(() => {
    // Web Crypto APIのモックをリセット
    vi.clearAllMocks();
    mockCrypto.subtle.digest.mockReset();
    mockCrypto.subtle.importKey.mockReset();
    mockCrypto.subtle.deriveKey.mockReset();
    mockCrypto.subtle.encrypt.mockReset();
    mockCrypto.subtle.decrypt.mockReset();
    mockCrypto.randomUUID.mockReturnValue("mock-uuid-12345");

    // モックされたストレージプロバイダーを作成
    const mockStorage = new Map<string, string>();
    storage = {
      getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) =>
        mockStorage.set(key, value),
      ),
      removeItem: vi.fn((key: string) => mockStorage.delete(key)),
      keys: vi.fn(() => Array.from(mockStorage.keys())),
      clear: vi.fn(() => mockStorage.clear()),
      addEventListener: vi.fn(() => () => {}),
    };

    cryptoProvider = createCryptoProvider({
      storage,
      deviceIdKey: "test-device-id",
    });
  });

  afterEach(() => {
    cryptoProvider.clearCache();
  });

  describe("isEncrypted", () => {
    it("Base64形式で最小長を満たすデータを暗号化済みと判定する", () => {
      // 有効なBase64文字列（12バイト以上）
      const validBase64 = btoa("This is a valid test string");
      expect(cryptoProvider.isEncrypted(validBase64)).toBe(true);
    });

    it("Base64形式でない文字列を暗号化されていないと判定する", () => {
      expect(cryptoProvider.isEncrypted("not-base64-@#$%")).toBe(false);
      expect(cryptoProvider.isEncrypted("plain text")).toBe(false);
    });

    it("短すぎるBase64文字列を暗号化されていないと判定する", () => {
      const shortBase64 = btoa("short");
      expect(cryptoProvider.isEncrypted(shortBase64)).toBe(false);
    });

    it("空文字列を暗号化されていないと判定する", () => {
      expect(cryptoProvider.isEncrypted("")).toBe(false);
    });
  });

  describe("encrypt", () => {
    it("文字列を暗号化できる", async () => {
      const plainText = "Hello, World!";
      const mockEncryptedData = new ArrayBuffer(32);
      const mockKey = {};

      // モックの設定
      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      // 暗号化結果をbase64文字列として返すようにモックを設定
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);

      const encrypted = await cryptoProvider.encrypt(plainText);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plainText);
      const callArgs = mockCrypto.subtle.encrypt.mock.calls[0];
      expect(callArgs[0].name).toBe("AES-GCM");
      expect(callArgs[0].iv).toBeDefined();
      expect(callArgs[0].iv.length).toBe(12);
      expect(callArgs[1]).toBe(mockKey);
      expect(callArgs[2]).toBeDefined();
      expect(callArgs[2].length).toBeGreaterThan(0);
    });

    it("ユーザーIDを使用して暗号化できる", async () => {
      const plainText = "User specific data";
      const userId = "user-123";
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      const encrypted = await cryptoProvider.encrypt(plainText, userId);

      expect(encrypted).toBeTruthy();
      // importKeyがユーザーIDを含むキーで呼ばれることを確認
      const importKeyCall = mockCrypto.subtle.importKey.mock.calls[0];
      expect(importKeyCall[0]).toBe("raw");
      expect(importKeyCall[1]).toBeDefined();
      expect(importKeyCall[1].length).toBeGreaterThan(0);
      expect(importKeyCall[2]).toBe("PBKDF2");
      expect(importKeyCall[3]).toBe(false);
      expect(importKeyCall[4]).toEqual(["deriveBits", "deriveKey"]);
    });

    it("暗号化に失敗した場合は平文を返す", async () => {
      const plainText = "Fallback test";

      // 暗号化エラーをシミュレート
      mockCrypto.subtle.encrypt.mockRejectedValue(
        new Error("Encryption failed"),
      );

      const result = await cryptoProvider.encrypt(plainText);

      expect(result).toBe(plainText);
    });

    it("大きなデータも暗号化できる", async () => {
      // 10KBのデータを生成
      const largeText = "x".repeat(10000);
      const mockEncryptedData = new ArrayBuffer(10000);
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);

      const encrypted = await cryptoProvider.encrypt(largeText);

      expect(encrypted).toBeTruthy();
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });
  });

  describe("decrypt", () => {
    it("暗号化されたデータを復号化できる", async () => {
      const originalText = "Secret message";
      const mockKey = {};

      // IVとデータを含む暗号化データを作成
      const iv = new Uint8Array(12);
      const encryptedData = new Uint8Array(20);
      const combined = new Uint8Array(iv.length + encryptedData.length);
      combined.set(iv);
      combined.set(encryptedData, iv.length);

      const encryptedBase64 = btoa(
        String.fromCharCode.apply(null, Array.from(combined)),
      );

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(originalText),
      );

      const decrypted = await cryptoProvider.decrypt(encryptedBase64);

      expect(decrypted).toBe(originalText);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "AES-GCM",
          iv: expect.any(Uint8Array),
        }),
        mockKey,
        expect.any(Uint8Array),
      );
    });

    it("ユーザーIDを使用して復号化できる", async () => {
      const originalText = "User data";
      const userId = "user-456";
      const mockKey = {};

      const combined = new Uint8Array(32);
      const encryptedBase64 = btoa(
        String.fromCharCode.apply(null, Array.from(combined)),
      );

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(originalText),
      );

      const decrypted = await cryptoProvider.decrypt(encryptedBase64, userId);

      expect(decrypted).toBe(originalText);
    });

    it("復号化に失敗した場合は元のデータを返す", async () => {
      const encryptedData = "invalid-encrypted-data!@#$%";

      // 復号化が失敗するようにモックを設定
      mockCrypto.subtle.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      // 明らかに無効なBase64文字列を渡す
      const decrypted = await cryptoProvider.decrypt(encryptedData);

      expect(decrypted).toBe(encryptedData);
    });

    it("大きなデータも復号化できる", async () => {
      const originalText = "y".repeat(10000);
      const mockKey = {};

      // 大きな暗号化データを作成
      const combined = new Uint8Array(10012); // IV(12) + data(10000)
      const encryptedBase64 = btoa(
        String.fromCharCode.apply(null, Array.from(combined)),
      );

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(originalText),
      );

      const decrypted = await cryptoProvider.decrypt(encryptedBase64);

      expect(decrypted).toBe(originalText);
    });
  });

  describe("キー生成とキャッシング", () => {
    it("同じユーザーIDでは同じキーを再利用する", async () => {
      const userId = "user-789";
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      // 1回目の暗号化
      await cryptoProvider.encrypt("data1", userId);
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(1);

      // 2回目の暗号化（キーがキャッシュされている）
      await cryptoProvider.encrypt("data2", userId);
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(1);
    });

    it("異なるユーザーIDでは新しいキーを生成する", async () => {
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      // ユーザー1で暗号化
      await cryptoProvider.encrypt("data1", "user-1");
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(1);

      // ユーザー2で暗号化（新しいキーが生成される）
      await cryptoProvider.encrypt("data2", "user-2");
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });

    it("clearCacheでキャッシュがクリアされる", async () => {
      const userId = "user-clear";
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      // 1回目の暗号化
      await cryptoProvider.encrypt("data1", userId);
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(1);

      // キャッシュをクリア
      cryptoProvider.clearCache();

      // 2回目の暗号化（新しいキーが生成される）
      await cryptoProvider.encrypt("data2", userId);
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });
  });

  describe("デバイスID管理", () => {
    it("デバイスIDが存在しない場合、新規作成してストレージに保存する", async () => {
      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      // ユーザーIDなしで暗号化（デバイスIDが使用される）
      await cryptoProvider.encrypt("data");

      expect(mockCrypto.randomUUID).toHaveBeenCalled();
      expect(storage.setItem).toHaveBeenCalledWith(
        "test-device-id",
        "mock-uuid-12345",
      );
    });

    it("既存のデバイスIDを再利用する", async () => {
      // 既存のデバイスIDを設定
      storage.setItem("test-device-id", "existing-device-id");

      const mockKey = {};

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));

      // ユーザーIDなしで暗号化
      await cryptoProvider.encrypt("data");

      expect(mockCrypto.randomUUID).not.toHaveBeenCalled();
      expect(storage.getItem).toHaveBeenCalledWith("test-device-id");
    });
  });

  describe("統合テスト", () => {
    it("暗号化と復号化が往復で動作する", async () => {
      const originalText = "This is a round-trip test!";
      const userId = "test-user";

      // 実際のWeb Crypto APIの動作をシミュレート
      const mockKey = {};
      const mockEncryptedData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      // 暗号化時の動作
      mockCrypto.subtle.encrypt.mockImplementation(async () => {
        return mockEncryptedData.buffer;
      });

      // 復号化時の動作
      mockCrypto.subtle.decrypt.mockImplementation(async () => {
        return new TextEncoder().encode(originalText).buffer;
      });

      // 暗号化
      const encrypted = await cryptoProvider.encrypt(originalText, userId);
      expect(encrypted).not.toBe(originalText);
      expect(cryptoProvider.isEncrypted(encrypted)).toBe(true);

      // 復号化
      const decrypted = await cryptoProvider.decrypt(encrypted, userId);
      expect(decrypted).toBe(originalText);
    });

    it("異なるユーザーIDでは復号化に失敗する", async () => {
      const originalText = "User-specific data";
      const mockKey1 = { key: 1 };
      const mockKey2 = { key: 2 };

      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue({});

      // ユーザーごとに異なるキーを返す
      let keyCallCount = 0;
      mockCrypto.subtle.deriveKey.mockImplementation(async () => {
        keyCallCount++;
        return keyCallCount === 1 ? mockKey1 : mockKey2;
      });

      mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error("Invalid key"));

      // ユーザー1で暗号化
      const encrypted = await cryptoProvider.encrypt(originalText, "user-1");

      // キャッシュをクリア（異なるキーを強制的に使用するため）
      cryptoProvider.clearCache();

      // ユーザー2で復号化を試みる（失敗する）
      const decrypted = await cryptoProvider.decrypt(encrypted, "user-2");

      // 復号化に失敗したため、元のデータが返される
      expect(decrypted).toBe(encrypted);
    });
  });
});
