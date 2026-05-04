import { Hono } from "hono";

import type { R2Bucket, R2ObjectBody } from "@cloudflare/workers-types";
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

      const req = new Request(
        "http://localhost/r2/uploads/icons/non-existent-key.webp",
      );
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(404);
      expect(await res.text()).toBe("Not Found");
      expect(mockR2Bucket.get).toHaveBeenCalledWith(
        "uploads/icons/non-existent-key.webp",
      );
    });

    it("画像が存在する場合は正しいヘッダーと共に画像を返す", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {
          contentType: "image/webp",
        },
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(
        mockObject as unknown as R2ObjectBody,
      );

      const req = new Request("http://localhost/r2/uploads/icons/test.webp");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(mockR2Bucket.get).toHaveBeenCalledWith("uploads/icons/test.webp");

      const responseBuffer = await res.arrayBuffer();
      expect(responseBuffer).toEqual(mockImageData);
    });

    it("コンテンツタイプが指定されていない場合はキー拡張子から推定する", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {},
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(
        mockObject as unknown as R2ObjectBody,
      );

      const req = new Request("http://localhost/r2/uploads/icons/test.png");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
    });

    it("ネストされたパスも正しく処理される", async () => {
      const mockImageData = new ArrayBuffer(1024);
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(mockImageData),
        httpMetadata: {
          contentType: "image/png",
        },
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(
        mockObject as unknown as R2ObjectBody,
      );

      const key = "uploads/icons/user-123/activity-456/icon.png";
      const req = new Request(`http://localhost/r2/${key}`);
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(200);
      expect(mockR2Bucket.get).toHaveBeenCalledWith(key);
    });

    it("不正なキー（パストラバーサル）は400を返す", async () => {
      const req = new Request(
        "http://localhost/r2/uploads/icons/../../secret.webp",
      );
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid key");
      expect(mockR2Bucket.get).not.toHaveBeenCalled();
    });

    it("不正なキー（許可プレフィックス外）は400を返す", async () => {
      const req = new Request("http://localhost/r2/private/user-1/icon.webp");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid key");
      expect(mockR2Bucket.get).not.toHaveBeenCalled();
    });

    it("画像以外のContent-Typeは415を返す", async () => {
      const mockObject = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        httpMetadata: {
          contentType: "text/plain",
        },
      };
      vi.mocked(mockR2Bucket.get).mockResolvedValue(
        mockObject as unknown as R2ObjectBody,
      );

      const req = new Request("http://localhost/r2/uploads/icons/test.webp");
      const res = await app.fetch(req, {
        R2_BUCKET: mockR2Bucket,
      });

      expect(res.status).toBe(415);
      expect(await res.text()).toBe("Unsupported content type");
    });
  });
});
