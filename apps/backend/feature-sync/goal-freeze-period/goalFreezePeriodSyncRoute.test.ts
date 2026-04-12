import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activityGoalFreezePeriods } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import { goalSyncRoute } from "../goal/goalSyncRoute";
import { goalFreezePeriodSyncRoute } from "./goalFreezePeriodSyncRoute";

const SEED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000001";
const TEST_GOAL_ID = "10000000-0000-4000-8000-000000000099";

const NOW = new Date().toISOString();

function makeFreezePeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    goalId: TEST_GOAL_ID,
    startDate: "2025-01-01",
    endDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", goalFreezePeriodSyncRoute)
    .route("/users/v2", goalSyncRoute);
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/goal-freeze-periods/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function createGoal(app: ReturnType<typeof createApp>, goalId: string) {
  return app.request(
    "/users/v2/goals/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: [
          {
            id: goalId,
            activityId: SEED_ACTIVITY_ID,
            dailyTargetQuantity: 10,
            startDate: "2025-01-01",
            endDate: null,
            isActive: true,
            description: "",
            debtCap: null,
            dayTargets: null,
            createdAt: NOW,
            updatedAt: NOW,
            deletedAt: null,
          },
        ],
      }),
    },
    { DB: testDB },
  );
}

async function getFreezePeriods(app: ReturnType<typeof createApp>, query = "") {
  return app.request(
    `/users/v2/goal-freeze-periods${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

describe("POST /users/v2/goal-freeze-periods/sync", () => {
  test("新規フリーズ期間の同期", async () => {
    const app = createApp();

    // ゴールを先に作成（所有権チェックのため）
    await createGoal(app, TEST_GOAL_ID);

    const newPeriod = makeFreezePeriod();
    const res = await postSync(app, { freezePeriods: [newPeriod] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(newPeriod.id);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("空配列の同期", async () => {
    const app = createApp();
    const res = await postSync(app, { freezePeriods: [] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(0);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("バリデーションエラー - 不正なペイロード", async () => {
    const app = createApp();
    const res = await postSync(app, {
      freezePeriods: [{ id: "not-a-uuid" }],
    });
    expect(res.status).toBe(400);
  });

  test("バリデーションエラー - freezePeriodsキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {});
    expect(res.status).toBe(400);
  });
});

describe("GET /users/v2/goal-freeze-periods", () => {
  test("全件取得", async () => {
    const app = createApp();
    const res = await getFreezePeriods(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.freezePeriods)).toBe(true);
  });

  test("since パラメータでフィルタリング - 未来の日時で0件", async () => {
    const app = createApp();

    const res = await getFreezePeriods(app, "since=2099-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.freezePeriods).toHaveLength(0);
  });

  test("since パラメータ - 無効な値で400", async () => {
    const app = createApp();

    const res = await getFreezePeriods(app, "since=not-a-date");
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.message).toContain("since");
  });

  test("since パラメータ - 日付のみ(時刻なし)で400", async () => {
    const app = createApp();

    const res = await getFreezePeriods(app, "since=2025-01-01");
    expect(res.status).toBe(400);
  });

  test("since パラメータ - 有効なISO 8601日時で正常レスポンス", async () => {
    const app = createApp();

    const res = await getFreezePeriods(app, "since=2000-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.freezePeriods)).toBe(true);
  });
});

describe("clock skew handling - 時計が遅いケース", () => {
  test("新規のupdatedAtがNOW()に引き上がりpull可能", async () => {
    const app = createApp();
    await createGoal(app, TEST_GOAL_ID);
    const beforePush = new Date(Date.now() - 1000).toISOString();

    const period = makeFreezePeriod({
      id: "10000000-0000-4000-8000-000000000070",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { freezePeriods: [period] });
    expect(pushRes.status).toBe(200);
    expect((await pushRes.json()).syncedIds).toContain(period.id);

    // fix-up により updatedAt >= NOW() → beforePush 以降の since で取得可能
    const pullRes = await getFreezePeriods(app, `since=${beforePush}`);
    const pullJson = await pullRes.json();
    expect(pullJson.freezePeriods.map((r: { id: string }) => r.id)).toContain(
      period.id,
    );
  });

  test("既存レコードの更新でupdatedAtがGREATESTで引き上がりpull可能", async () => {
    const app = createApp();
    await createGoal(app, TEST_GOAL_ID);
    const periodId = crypto.randomUUID();

    // DB直接挿入: fix-upを経由しない既知のupdatedAtを持つレコード
    await testDB.insert(activityGoalFreezePeriods).values({
      id: periodId,
      userId: TEST_USER_ID,
      goalId: TEST_GOAL_ID,
      startDate: "2025-01-01",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const beforeUpdate = new Date(Date.now() - 1000).toISOString();

    // DBより新しいがNOW()より古い updatedAt で更新（時計遅れを再現）
    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedPeriod = makeFreezePeriod({
      id: periodId,
      startDate: "2025-03-01",
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { freezePeriods: [updatedPeriod] });
    const pushJson = await pushRes.json();
    // LWW: DB(2020) < client(2023) → client wins
    expect(pushJson.syncedIds).toContain(periodId);

    // SET GREATEST(2023, NOW()) = NOW() → pull可能
    const pullRes = await getFreezePeriods(app, `since=${beforeUpdate}`);
    const pullJson = await pullRes.json();
    const found = pullJson.freezePeriods.find(
      (r: { id: string }) => r.id === periodId,
    );
    expect(found).toBeDefined();
    expect(found.startDate).toBe("2025-03-01");
  });

  test("古い更新はserver winsを維持（LWW不変）", async () => {
    const app = createApp();
    await createGoal(app, TEST_GOAL_ID);

    const periodId = "10000000-0000-4000-8000-000000000071";
    await postSync(app, {
      freezePeriods: [
        makeFreezePeriod({ id: periodId, startDate: "2025-01-01" }),
      ],
    });

    const oldPeriod = makeFreezePeriod({
      id: periodId,
      startDate: "2024-01-01",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { freezePeriods: [oldPeriod] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).not.toContain(periodId);
    expect(pushJson.serverWins).toHaveLength(1);
    expect(pushJson.serverWins[0].id).toBe(periodId);
  });
});

describe("clock skew handling - 時計が早いケース", () => {
  test("5分以内の新規レコードが同期・pull可能", async () => {
    const app = createApp();
    await createGoal(app, TEST_GOAL_ID);
    const threeMinAhead = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const period = makeFreezePeriod({
      id: "10000000-0000-4000-8000-000000000072",
      updatedAt: threeMinAhead,
    });

    const pushRes = await postSync(app, { freezePeriods: [period] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(period.id);
    expect(pushJson.skippedIds).toHaveLength(0);

    // updatedAt > NOW() なので since=NOW でも取得可能
    const pullRes = await getFreezePeriods(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    expect(pullJson.freezePeriods.map((r: { id: string }) => r.id)).toContain(
      period.id,
    );
  });

  test("5分以内の更新がクライアント値のまま保存される", async () => {
    const app = createApp();
    await createGoal(app, TEST_GOAL_ID);
    const periodId = crypto.randomUUID();

    await testDB.insert(activityGoalFreezePeriods).values({
      id: periodId,
      userId: TEST_USER_ID,
      goalId: TEST_GOAL_ID,
      startDate: "2025-01-01",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const twoMinAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const updatedPeriod = makeFreezePeriod({
      id: periodId,
      startDate: "2025-06-01",
      updatedAt: twoMinAhead,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { freezePeriods: [updatedPeriod] });
    expect((await pushRes.json()).syncedIds).toContain(periodId);

    // クライアント値(NOW+2m) > NOW() → GREATESTはクライアント値を採用
    // since=NOW でも取得可能（updatedAt > NOW）
    const pullRes = await getFreezePeriods(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    const found = pullJson.freezePeriods.find(
      (r: { id: string }) => r.id === periodId,
    );
    expect(found).toBeDefined();
    expect(found.startDate).toBe("2025-06-01");
  });
});
