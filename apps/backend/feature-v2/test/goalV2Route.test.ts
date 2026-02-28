import { Hono } from "hono";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, test } from "vitest";

import { goalV2Route } from "../goalV2Route";

const SEED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000001";

const NOW = new Date().toISOString();

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: SEED_ACTIVITY_ID,
    dailyTargetQuantity: 10,
    startDate: "2025-01-01",
    endDate: null,
    isActive: true,
    description: "",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return new Hono()
    .use(mockAuthMiddleware)
    .route("/users/v2", goalV2Route);
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/goals/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function getGoals(
  app: ReturnType<typeof createApp>,
  query = "",
) {
  return app.request(
    `/users/v2/goals${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

describe("POST /users/v2/goals/sync", () => {
  test("新規ゴールの同期", async () => {
    const app = createApp();
    const newGoal = makeGoal();

    const res = await postSync(app, { goals: [newGoal] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(newGoal.id);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("所有権チェック - 存在しないactivityIdはskip", async () => {
    const app = createApp();
    const goal = makeGoal({
      activityId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, { goals: [goal] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(goal.id);
    expect(json.syncedIds).toHaveLength(0);
  });

  test("既存ゴールの更新 (LWW - クライアント勝利)", async () => {
    const app = createApp();

    // まず新規ゴールを作成
    const goalId = "10000000-0000-4000-8000-000000000010";
    const createRes = await postSync(app, {
      goals: [makeGoal({ id: goalId })],
    });
    expect(createRes.status).toBe(200);

    // 更新 (より新しいupdatedAt)
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 20,
      description: "updated",
      updatedAt: futureDate,
    });

    const res = await postSync(app, { goals: [updatedGoal] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(goalId);
    expect(json.serverWins).toHaveLength(0);
  });

  test("serverWins - サーバー側が新しい場合", async () => {
    const app = createApp();

    // まず新規ゴールを作成
    const goalId = "10000000-0000-4000-8000-000000000020";
    const createRes = await postSync(app, {
      goals: [makeGoal({ id: goalId })],
    });
    expect(createRes.status).toBe(200);

    // 古いupdatedAtで再同期 → serverWins
    const oldGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 99,
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, { goals: [oldGoal] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).not.toContain(goalId);
    expect(json.serverWins).toHaveLength(1);
    expect(json.serverWins[0].id).toBe(goalId);
  });

  test("バリデーションエラー - 不正なペイロード", async () => {
    const app = createApp();
    const res = await postSync(app, {
      goals: [{ id: "not-a-uuid" }],
    });
    expect(res.status).toBe(400);
  });

  test("空配列の同期", async () => {
    const app = createApp();
    const res = await postSync(app, { goals: [] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(0);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("複数ゴールの一括同期", async () => {
    const app = createApp();
    const goals = [
      makeGoal({ id: "10000000-0000-4000-8000-000000000001" }),
      makeGoal({ id: "10000000-0000-4000-8000-000000000002" }),
      makeGoal({ id: "10000000-0000-4000-8000-000000000003" }),
    ];

    const res = await postSync(app, { goals });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(3);
    for (const goal of goals) {
      expect(json.syncedIds).toContain(goal.id);
    }
  });

  test("max 100 バリデーション - 101件で400", async () => {
    const app = createApp();
    const goals = Array.from({ length: 101 }, (_, i) =>
      makeGoal({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      }),
    );

    const res = await postSync(app, { goals });
    expect(res.status).toBe(400);
  });
});

describe("GET /users/v2/goals", () => {
  test("全件取得 - シードにゴールなし", async () => {
    const app = createApp();
    const res = await getGoals(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.goals).toHaveLength(0);
  });

  test("sync後にGETで取得できる", async () => {
    const app = createApp();
    const goalId = "10000000-0000-4000-8000-000000000030";

    // まずsyncでゴールを作成
    await postSync(app, {
      goals: [makeGoal({ id: goalId })],
    });

    const res = await getGoals(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.goals.length).toBeGreaterThanOrEqual(1);
    const goalIds = json.goals.map((g: { id: string }) => g.id);
    expect(goalIds).toContain(goalId);
  });
});
