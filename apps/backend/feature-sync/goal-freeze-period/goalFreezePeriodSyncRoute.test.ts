import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, test } from "vitest";

import { goalSyncRoute } from "../goal";
import { goalFreezePeriodSyncRoute } from ".";

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
