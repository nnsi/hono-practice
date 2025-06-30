import { Hono } from "hono";
import { testClient } from "hono/testing";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, it } from "vitest";

import { createSyncRoute } from "../syncRoute";

describe("Sync API Routes", () => {
  describe("POST /sync/check-duplicates", () => {
    it("重複チェックを実行できる", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client["check-duplicates"].$post({
        json: {
          operations: [
            {
              entityType: "activity",
              entityId: "activity-1",
              timestamp: new Date().toISOString(),
              operation: "create",
            },
          ],
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
    });

    it("不正なリクエストボディの場合は400エラー", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client["check-duplicates"].$post({
        json: {
          operations: [
            {
              entityType: "activity",
              // entityId が欠けている
              timestamp: new Date().toISOString(),
              operation: "create",
            },
          ],
        } as any,
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /sync/status", () => {
    it("同期状況を取得できる", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client.status.$get();

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty("status");
      expect(result.status).toHaveProperty("pendingCount");
      expect(result.status).toHaveProperty("syncingCount");
      expect(result.status).toHaveProperty("syncedCount");
      expect(result.status).toHaveProperty("failedCount");
      expect(result.status).toHaveProperty("totalCount");
      expect(result.status).toHaveProperty("syncPercentage");
    });
  });

  describe("POST /sync/enqueue", () => {
    it("同期操作をエンキューできる", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client.enqueue.$post({
        json: {
          operations: [
            {
              entityType: "activity",
              entityId: "activity-1",
              operation: "create",
              payload: { name: "Test Activity" },
              timestamp: new Date().toISOString(),
              sequenceNumber: 1,
            },
          ],
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty("enqueuedCount");
      expect(result).toHaveProperty("operations");
      expect(Array.isArray(result.operations)).toBe(true);
    });

    it("不正な操作タイプの場合は400エラー", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client.enqueue.$post({
        json: {
          operations: [
            {
              entityType: "activity",
              entityId: "activity-1",
              operation: "invalid", // 無効な操作タイプ
              payload: {},
              timestamp: new Date().toISOString(),
              sequenceNumber: 1,
            },
          ],
        } as any,
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /sync/process", () => {
    it("同期キューを処理できる", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client.process.$post({
        json: {
          batchSize: 10,
          maxRetries: 3,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty("processedCount");
      expect(result).toHaveProperty("failedCount");
      expect(result).toHaveProperty("hasMore");
    });

    it("バッチサイズの上限を超える場合は400エラー", async () => {
      const route = createSyncRoute();
      const app = new Hono().use(mockAuthMiddleware).route("/", route);
      const client = testClient(app, {
        DB: testDB,
      });

      const response = await client.process.$post({
        json: {
          batchSize: 101, // 上限を超える
        },
      });

      expect(response.status).toBe(400);
    });
  });
});
