import { beforeEach, describe, expect, it, vi } from "vitest";

import { newR2StorageService } from "../r2StorageService";

import type { R2Bucket, R2Object } from "@cloudflare/workers-types";

// R2Bucketのモックを作成
const createMockR2Bucket = (): R2Bucket => {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    head: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  } as unknown as R2Bucket;
};

// R2Objectのモックを作成
const createMockR2Object = (overrides?: Partial<R2Object>): R2Object => {
  return {
    key: "test-key",
    version: "v1",
    size: 1024,
    etag: "etag-123",
    httpEtag: "http-etag-123",
    uploaded: new Date(),
    httpMetadata: {
      contentType: "image/webp",
    },
    customMetadata: {},
    range: { offset: 0, length: 1024 },
    checksums: {},
    storageClass: "STANDARD",
    ...overrides,
  } as R2Object;
};

describe("r2StorageService", () => {
  let mockR2Bucket: R2Bucket;
  let storageService: ReturnType<typeof newR2StorageService>;
  const appUrl = "https://example.com";

  beforeEach(() => {
    mockR2Bucket = createMockR2Bucket();
    storageService = newR2StorageService(mockR2Bucket, appUrl);
  });

  describe("upload", () => {
    it("ファイルをR2にアップロードして正しいURLを返す", async () => {
      const mockFile = new File(["test content"], "test.webp", {
        type: "image/webp",
      });
      const key = "uploads/icons/test.webp";
      const mockR2Object = createMockR2Object({ key, size: mockFile.size });

      vi.mocked(mockR2Bucket.put).mockResolvedValue(mockR2Object);

      const result = await storageService.upload(mockFile, key);

      expect(result).toEqual({
        url: `${appUrl}/r2/${key}`,
        key,
        size: mockFile.size,
        contentType: "image/webp",
      });

      expect(mockR2Bucket.put).toHaveBeenCalledWith(
        key,
        expect.any(ArrayBuffer),
        {
          httpMetadata: {
            contentType: "image/webp",
          },
          customMetadata: undefined,
        },
      );
    });

    it("カスタムメタデータとコンテンツタイプをオプションで指定できる", async () => {
      const mockFile = new File(["test content"], "test.png");
      const key = "uploads/test.png";
      const options = {
        contentType: "image/png",
        metadata: { userId: "123", activityId: "456" },
      };
      const mockR2Object = createMockR2Object({
        key,
        size: mockFile.size,
        httpMetadata: { contentType: options.contentType },
      });

      vi.mocked(mockR2Bucket.put).mockResolvedValue(mockR2Object);

      const result = await storageService.upload(mockFile, key, options);

      expect(result.contentType).toBe("image/png");
      expect(mockR2Bucket.put).toHaveBeenCalledWith(
        key,
        expect.any(ArrayBuffer),
        {
          httpMetadata: {
            contentType: "image/png",
          },
          customMetadata: options.metadata,
        },
      );
    });

    it("アップロードに失敗した場合はエラーをスロー", async () => {
      const mockFile = new File(["test content"], "test.webp");
      const key = "uploads/test.webp";

      vi.mocked(mockR2Bucket.put).mockResolvedValue(null as any);

      await expect(storageService.upload(mockFile, key)).rejects.toThrow(
        "Failed to upload file to R2",
      );
    });

    it("ファイルタイプが指定されていない場合はデフォルトを使用", async () => {
      const mockFile = new File(["test content"], "test.bin");
      const key = "uploads/test.bin";
      const mockR2Object = createMockR2Object({
        key,
        size: mockFile.size,
        httpMetadata: {},
      });

      vi.mocked(mockR2Bucket.put).mockResolvedValue(mockR2Object);

      const result = await storageService.upload(mockFile, key);

      expect(result.contentType).toBe("application/octet-stream");
    });
  });

  describe("delete", () => {
    it("指定されたキーのファイルを削除する", async () => {
      const key = "uploads/icons/test.webp";
      vi.mocked(mockR2Bucket.delete).mockResolvedValue(undefined);

      await storageService.delete(key);

      expect(mockR2Bucket.delete).toHaveBeenCalledWith(key);
    });
  });

  describe("getUrl", () => {
    it("R2プロキシ経由のURLを返す", () => {
      const key = "uploads/icons/test.webp";
      const url = storageService.getUrl(key);

      expect(url).toBe(`${appUrl}/r2/${key}`);
    });

    it("ネストされたパスも正しく処理される", () => {
      const key = "uploads/icons/user-123/activity-456/icon.png";
      const url = storageService.getUrl(key);

      expect(url).toBe(`${appUrl}/r2/${key}`);
    });
  });

  describe("exists", () => {
    it("ファイルが存在する場合はtrueを返す", async () => {
      const key = "uploads/icons/test.webp";
      const mockR2Object = createMockR2Object({ key });

      vi.mocked(mockR2Bucket.head).mockResolvedValue(mockR2Object);

      const exists = await storageService.exists(key);

      expect(exists).toBe(true);
      expect(mockR2Bucket.head).toHaveBeenCalledWith(key);
    });

    it("ファイルが存在しない場合はfalseを返す", async () => {
      const key = "uploads/icons/non-existent.webp";

      vi.mocked(mockR2Bucket.head).mockResolvedValue(null);

      const exists = await storageService.exists(key);

      expect(exists).toBe(false);
      expect(mockR2Bucket.head).toHaveBeenCalledWith(key);
    });
  });
});
