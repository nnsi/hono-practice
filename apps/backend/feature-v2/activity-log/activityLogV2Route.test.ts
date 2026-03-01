import { Hono } from "hono";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, test } from "vitest";

import { activityLogV2Route } from ".";

const SEED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000001";
const SEED_ACTIVITY_KIND_ID = "00000000-0000-4000-8000-000000000001";
const SEED_LOG_ID = "00000000-0000-4000-8000-000000000001";

const NOW = new Date().toISOString();

function makeLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: SEED_ACTIVITY_ID,
    activityKindId: null,
    quantity: 5,
    memo: "",
    date: "2025-01-01",
    time: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return new Hono()
    .use(mockAuthMiddleware)
    .route("/users/v2", activityLogV2Route);
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/activity-logs/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function getActivityLogs(
  app: ReturnType<typeof createApp>,
  query = "",
) {
  return app.request(
    `/users/v2/activity-logs${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

describe("POST /users/v2/activity-logs/sync", () => {
  test("新規ログの同期", async () => {
    const app = createApp();
    const newLog = makeLog();

    const res = await postSync(app, { logs: [newLog] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(newLog.id);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("既存ログの更新 (LWW - クライアント勝利)", async () => {
    const app = createApp();
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedLog = makeLog({
      id: SEED_LOG_ID,
      activityId: SEED_ACTIVITY_ID,
      activityKindId: SEED_ACTIVITY_KIND_ID,
      quantity: 99,
      date: "2021-01-01",
      updatedAt: futureDate,
    });

    const res = await postSync(app, { logs: [updatedLog] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(SEED_LOG_ID);
    expect(json.serverWins).toHaveLength(0);
  });

  test("serverWins - サーバー側が新しい場合", async () => {
    const app = createApp();
    const oldLog = makeLog({
      id: SEED_LOG_ID,
      activityId: SEED_ACTIVITY_ID,
      activityKindId: SEED_ACTIVITY_KIND_ID,
      quantity: 99,
      date: "2021-01-01",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, { logs: [oldLog] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).not.toContain(SEED_LOG_ID);
    expect(json.serverWins).toHaveLength(1);
    expect(json.serverWins[0].id).toBe(SEED_LOG_ID);
  });

  test("所有権チェック - 存在しないactivityIdはskip", async () => {
    const app = createApp();
    const log = makeLog({
      activityId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, { logs: [log] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(log.id);
    expect(json.syncedIds).toHaveLength(0);
  });

  test("バリデーションエラー - 必須フィールド欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {
      logs: [{ id: "not-a-uuid" }],
    });
    expect(res.status).toBe(400);
  });

  test("空配列の同期", async () => {
    const app = createApp();
    const res = await postSync(app, { logs: [] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(0);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("複数ログの一括同期", async () => {
    const app = createApp();
    const logs = [
      makeLog({ id: "10000000-0000-4000-8000-000000000001", date: "2025-01-01" }),
      makeLog({ id: "10000000-0000-4000-8000-000000000002", date: "2025-01-02" }),
      makeLog({ id: "10000000-0000-4000-8000-000000000003", date: "2025-01-03" }),
    ];

    const res = await postSync(app, { logs });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(3);
    for (const log of logs) {
      expect(json.syncedIds).toContain(log.id);
    }
  });

  test("max 100 バリデーション - 101件で400", async () => {
    const app = createApp();
    const logs = Array.from({ length: 101 }, (_, i) =>
      makeLog({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        date: "2025-01-01",
      }),
    );

    const res = await postSync(app, { logs });
    expect(res.status).toBe(400);
  });

  test("max 100 バリデーション - ちょうど100件でOK", async () => {
    const app = createApp();
    const logs = Array.from({ length: 100 }, (_, i) =>
      makeLog({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        date: "2025-01-01",
      }),
    );

    const res = await postSync(app, { logs });
    expect(res.status).toBe(200);
  });

  test("バリデーションエラー - logsキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {});
    expect(res.status).toBe(400);
  });
});

describe("GET /users/v2/activity-logs", () => {
  test("全件取得", async () => {
    const app = createApp();
    const res = await getActivityLogs(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.logs).toHaveLength(1);
    expect(json.logs[0].id).toBe(SEED_LOG_ID);
  });

  test("since パラメータでフィルタリング", async () => {
    const app = createApp();

    // 未来の日時を指定 → 結果は0件
    const res = await getActivityLogs(app, "since=2099-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.logs).toHaveLength(0);
  });

  test("since パラメータ - 過去の日時で全件返る", async () => {
    const app = createApp();

    const res = await getActivityLogs(app, "since=2000-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.logs).toHaveLength(1);
  });
});
