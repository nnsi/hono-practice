import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activityLogs } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import { activityLogSyncRoute } from ".";

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
    taskId: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", activityLogSyncRoute);
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

async function getActivityLogs(app: ReturnType<typeof createApp>, query = "") {
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

  test("FK チェック - 存在しないactivityKindIdはskip", async () => {
    const app = createApp();
    const log = makeLog({
      activityKindId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, { logs: [log] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(log.id);
    expect(json.syncedIds).toHaveLength(0);
  });

  test("FK チェック - 存在しないtaskIdはskip", async () => {
    const app = createApp();
    const log = makeLog({
      taskId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, { logs: [log] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(log.id);
    expect(json.syncedIds).toHaveLength(0);
  });

  test("FK チェック - 存在するactivityKindIdは正常同期", async () => {
    const app = createApp();
    const log = makeLog({
      activityKindId: SEED_ACTIVITY_KIND_ID,
    });

    const res = await postSync(app, { logs: [log] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(log.id);
    expect(json.skippedIds).toHaveLength(0);
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
      makeLog({
        id: "10000000-0000-4000-8000-000000000001",
        date: "2025-01-01",
      }),
      makeLog({
        id: "10000000-0000-4000-8000-000000000002",
        date: "2025-01-02",
      }),
      makeLog({
        id: "10000000-0000-4000-8000-000000000003",
        date: "2025-01-03",
      }),
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

describe("clock skew handling - 時計が遅いケース", () => {
  test("新規のupdatedAtがNOW()に引き上がりpull可能", async () => {
    const app = createApp();
    const beforePush = new Date(Date.now() - 1000).toISOString();

    const log = makeLog({
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { logs: [log] });
    expect(pushRes.status).toBe(200);
    expect((await pushRes.json()).syncedIds).toContain(log.id);

    // fix-up により updatedAt >= NOW() → beforePush 以降の since で取得可能
    const pullRes = await getActivityLogs(app, `since=${beforePush}`);
    const pullJson = await pullRes.json();
    expect(pullJson.logs.map((r: { id: string }) => r.id)).toContain(log.id);
  });

  test("既存レコードの更新でupdatedAtがGREATESTで引き上がりpull可能", async () => {
    const app = createApp();
    const logId = crypto.randomUUID();

    // DB直接挿入: fix-upを経由しない既知のupdatedAtを持つレコード
    await testDB.insert(activityLogs).values({
      id: logId,
      userId: TEST_USER_ID,
      activityId: SEED_ACTIVITY_ID,
      quantity: 1,
      date: "2025-01-01",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const beforeUpdate = new Date(Date.now() - 1000).toISOString();

    // DBより新しいがNOW()より古い updatedAt で更新（時計遅れを再現）
    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedLog = makeLog({
      id: logId,
      quantity: 99,
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { logs: [updatedLog] });
    const pushJson = await pushRes.json();
    // LWW: DB(2020) < client(2023) → client wins
    expect(pushJson.syncedIds).toContain(logId);

    // SET GREATEST(2023, NOW()) = NOW() → pull可能
    const pullRes = await getActivityLogs(app, `since=${beforeUpdate}`);
    const pullJson = await pullRes.json();
    const found = pullJson.logs.find((r: { id: string }) => r.id === logId);
    expect(found).toBeDefined();
    expect(found.quantity).toBe(99);
  });

  test("古い更新はserver winsを維持（LWW不変）", async () => {
    const app = createApp();

    const log = makeLog({
      id: SEED_LOG_ID,
      activityId: SEED_ACTIVITY_ID,
      quantity: 10,
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { logs: [log] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).not.toContain(SEED_LOG_ID);
    expect(pushJson.serverWins).toHaveLength(1);
    expect(pushJson.serverWins[0].id).toBe(SEED_LOG_ID);
  });
});

describe("clock skew handling - 時計が早いケース", () => {
  test("5分以内の新規レコードが同期・pull可能", async () => {
    const app = createApp();
    const threeMinAhead = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const log = makeLog({ updatedAt: threeMinAhead });

    const pushRes = await postSync(app, { logs: [log] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(log.id);
    expect(pushJson.skippedIds).toHaveLength(0);

    // updatedAt > NOW() なので since=NOW でも取得可能
    const pullRes = await getActivityLogs(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    expect(pullJson.logs.map((r: { id: string }) => r.id)).toContain(log.id);
  });

  test("5分以内の更新がクライアント値のまま保存される", async () => {
    const app = createApp();
    const logId = crypto.randomUUID();

    await testDB.insert(activityLogs).values({
      id: logId,
      userId: TEST_USER_ID,
      activityId: SEED_ACTIVITY_ID,
      quantity: 1,
      date: "2025-01-01",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const twoMinAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const updatedLog = makeLog({
      id: logId,
      quantity: 42,
      updatedAt: twoMinAhead,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { logs: [updatedLog] });
    expect((await pushRes.json()).syncedIds).toContain(logId);

    // クライアント値(NOW+2m) > NOW() → GREATESTはクライアント値を採用
    // since=NOW でも取得可能（updatedAt > NOW）
    const pullRes = await getActivityLogs(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    const found = pullJson.logs.find((r: { id: string }) => r.id === logId);
    expect(found).toBeDefined();
    expect(found.quantity).toBe(42);
  });
});
