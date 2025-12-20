import { Hono } from "hono";

import type { R2Bucket } from "@cloudflare/workers-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { r2ProxyRoute } from "../r2ProxyRoute";

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

describe("r2ProxyRoute", () => {
  let app: Hono;
  let mockR2Bucket: R2Bucket;

  beforeEach(() => {
    app = new Hono();
    mockR2Bucket = createMockR2Bucket();
    app.route("/r2", r2ProxyRoute);
  });

  describe("GET /:key", () => {
    it("R2バケットが設定されていない場合は500エラーを返す", async () => {
      const req = new Request("http://localhost/r2/test-key");
      const res = await app.fetch(req, {
        R2_BUCKET: undefined,
      });

      expect(res.status).toBe(500);
      expect(await res.text()).toBe("R2 bucket not configured");
    });

    it("存在しないキーの場合は404エラーを返す", async () => {
      vi.mocked(mockR2Bucket.get).mockResolvedValue(null);

      const req = new Request("http://localhost/r2/non-existent-key");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Not Found");
      expect(mockR2Bucket.get).toHaveBeenCalledWith("non-existent-key");
    });

    it("画像が存在する場合は正しいヘッダーと共に画像を返す", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {
          contentType: "image/webp",
        },
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(mockObject as any);

      const req = new Request("http://localhost/r2/uploads/icons/test.webp");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
      expect(mockR2Bucket.get).toHaveBeenCalledWith("uploads/icons/test.webp");

      const responseBuffer = await res.arrayBuffer();
      expect(responseBuffer).toEqual(mockImageData);
    });

    it("コンテンツタイプが指定されていない場合はデフォルトを使用", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {},
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(mockObject as any);

      const req = new Request("http://localhost/r2/uploads/icons/test");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    });

    it("ネストされたパスも正しく処理される", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {
          contentType: "image/png",
        },
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(mockObject as any);

      const key = "uploads/icons/user-123/activity-456/icon.png";
      const req = new Request(`http://localhost/r2/${key}`);
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(mockR2Bucket.get).toHaveBeenCalledWith(key);
    });
  });
});
