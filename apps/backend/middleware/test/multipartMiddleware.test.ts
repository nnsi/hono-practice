import { Hono } from "hono";

import { multipartMiddleware } from "@backend/middleware/multipartMiddleware";
import { describe, expect, it } from "vitest";

describe("multipartMiddleware", () => {
  it("multipart/form-dataリクエストを処理し、ファイルをコンテキストに保存する", async () => {
    const app = new Hono();
    let storedFile: File | undefined;

    app.post("/upload", multipartMiddleware, async (c) => {
      storedFile = (c as any).get("uploadedFile") as File | undefined;
      return c.json({ success: true });
    });

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    const response = await app.request("/upload", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(200);
    expect(storedFile?.name).toBe("test.txt");
    expect(storedFile?.size).toBe(12); // "test content" is 12 bytes
  });

  it("非multipart/form-dataリクエストはそのまま通す", async () => {
    const app = new Hono();

    app.post("/upload", multipartMiddleware, async (c) => {
      const uploadedFile = (c as any).get("uploadedFile") as File | undefined;
      return c.json({ success: true, hasFile: !!uploadedFile });
    });

    const response = await app.request("/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: "data" }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.hasFile).toBe(false);
  });

  it("ファイルがアップロードされていない場合はエラーを返す", async () => {
    const app = new Hono();

    app.onError((err: any, c) => {
      const status = err.status || 500;
      return c.json({ error: err.message }, status);
    });

    app.post("/upload", multipartMiddleware, async (c) => {
      return c.json({ success: true });
    });

    const formData = new FormData();
    formData.append("field", "value"); // ファイルではない

    const response = await app.request("/upload", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("No file uploaded");
  });

  it("5MBを超えるファイルを拒否する", async () => {
    const app = new Hono();

    app.onError((err: any, c) => {
      const status = err.status || 500;
      return c.json({ error: err.message }, status);
    });

    app.post("/upload", multipartMiddleware, async (c) => {
      return c.json({ success: true });
    });

    const largeContent = "a".repeat(5 * 1024 * 1024 + 1); // 5MB + 1 byte
    const file = new File([largeContent], "large.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    const response = await app.request("/upload", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("File size exceeds 5MB limit");
  });

  it("無効なFormDataでエラーを返す", async () => {
    const app = new Hono();

    app.onError((err: any, c) => {
      const status = err.status || 500;
      return c.json({ error: err.message }, status);
    });

    app.post("/upload", multipartMiddleware, async (c) => {
      return c.json({ success: true });
    });

    const response = await app.request("/upload", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data", // boundary無しの不正なヘッダー
      },
      body: "invalid data",
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toBe("Failed to parse multipart form data");
  });
});
