import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activityGoals } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import { goalSyncRoute } from ".";

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
    debtCap: null,
    dayTargets: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", goalSyncRoute);
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

async function getGoals(app: ReturnType<typeof createApp>, query = "") {
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

  test("max 100 バリデーション - ちょうど100件でOK", async () => {
    const app = createApp();
    const goals = Array.from({ length: 100 }, (_, i) =>
      makeGoal({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      }),
    );

    const res = await postSync(app, { goals });
    expect(res.status).toBe(200);
  });

  test("dayTargetsを含む新規ゴールの同期", async () => {
    const app = createApp();
    const goal = makeGoal({
      id: "10000000-0000-4000-8000-000000000060",
      dayTargets: {
        "1": 10,
        "2": 10,
        "3": 10,
        "4": 10,
        "5": 10,
        "6": 20,
        "7": 0,
      },
    });

    const res = await postSync(app, { goals: [goal] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(goal.id);
  });

  test("dayTargets不正キーはバリデーションエラー", async () => {
    const app = createApp();
    const goal = makeGoal({
      id: "10000000-0000-4000-8000-000000000061",
      dayTargets: { "8": 10, foo: 5 },
    });

    const res = await postSync(app, { goals: [goal] });
    expect(res.status).toBe(400);
  });

  test("バリデーションエラー - goalsキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {});
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

  test("since パラメータでフィルタリング - 未来の日時で0件", async () => {
    const app = createApp();

    // まずゴールを作成
    await postSync(app, {
      goals: [makeGoal({ id: "10000000-0000-4000-8000-000000000040" })],
    });

    const res = await getGoals(app, "since=2099-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.goals).toHaveLength(0);
  });

  test("since パラメータ - 過去の日時で取得できる", async () => {
    const app = createApp();

    await postSync(app, {
      goals: [makeGoal({ id: "10000000-0000-4000-8000-000000000050" })],
    });

    const res = await getGoals(app, "since=2000-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.goals.length).toBeGreaterThanOrEqual(1);
  });

  test("clientDate パラメータを渡しても正常に取得できる", async () => {
    const app = createApp();

    await postSync(app, {
      goals: [makeGoal({ id: "10000000-0000-4000-8000-000000000055" })],
    });

    const res = await getGoals(app, "clientDate=2026-03-29");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.goals.length).toBeGreaterThanOrEqual(1);
    expect(json.goals[0]).toHaveProperty("currentBalance");
    expect(json.goals[0]).toHaveProperty("totalTarget");
    expect(json.goals[0]).toHaveProperty("totalActual");
  });
});

describe("clock skew handling - 時計が遅いケース", () => {
  test("新規のupdatedAtがNOW()に引き上がりpull可能", async () => {
    const app = createApp();
    const beforePush = new Date(Date.now() - 1000).toISOString();

    const goal = makeGoal({
      id: "10000000-0000-4000-8000-000000000070",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { goals: [goal] });
    expect(pushRes.status).toBe(200);
    expect((await pushRes.json()).syncedIds).toContain(goal.id);

    // fix-up により updatedAt >= NOW() → beforePush 以降の since で取得可能
    const pullRes = await getGoals(
      app,
      `since=${beforePush}&clientDate=2025-01-01`,
    );
    const pullJson = await pullRes.json();
    expect(pullJson.goals.map((g: { id: string }) => g.id)).toContain(goal.id);
  });

  test("既存レコードの更新でupdatedAtがGREATESTで引き上がりpull可能", async () => {
    const app = createApp();
    const goalId = crypto.randomUUID();

    // DB直接挿入: fix-upを経由しない既知のupdatedAtを持つレコード
    await testDB.insert(activityGoals).values({
      id: goalId,
      userId: TEST_USER_ID,
      activityId: SEED_ACTIVITY_ID,
      dailyTargetQuantity: 10,
      startDate: "2025-01-01",
      isActive: true,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const beforeUpdate = new Date(Date.now() - 1000).toISOString();

    // DBより新しいがNOW()より古い updatedAt で更新（時計遅れを再現）
    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 20,
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { goals: [updatedGoal] });
    const pushJson = await pushRes.json();
    // LWW: DB(2020) < client(2023) → client wins
    expect(pushJson.syncedIds).toContain(goalId);

    // SET GREATEST(2023, NOW()) = NOW() → pull可能
    const pullRes = await getGoals(
      app,
      `since=${beforeUpdate}&clientDate=2025-01-01`,
    );
    const pullJson = await pullRes.json();
    const found = pullJson.goals.find((g: { id: string }) => g.id === goalId);
    expect(found).toBeDefined();
    expect(found.dailyTargetQuantity).toBe(20);
  });

  test("古い更新はserver winsを維持（LWW不変）", async () => {
    const app = createApp();

    const goalId = "10000000-0000-4000-8000-000000000071";
    await postSync(app, {
      goals: [makeGoal({ id: goalId, dailyTargetQuantity: 5 })],
    });

    const oldGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 99,
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { goals: [oldGoal] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).not.toContain(goalId);
    expect(pushJson.serverWins).toHaveLength(1);
    expect(pushJson.serverWins[0].id).toBe(goalId);
  });
});

describe("clock skew handling - 時計が早いケース", () => {
  test("5分以内の新規レコードが同期・pull可能", async () => {
    const app = createApp();
    const threeMinAhead = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const goal = makeGoal({
      id: "10000000-0000-4000-8000-000000000072",
      updatedAt: threeMinAhead,
    });

    const pushRes = await postSync(app, { goals: [goal] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(goal.id);
    expect(pushJson.skippedIds).toHaveLength(0);

    // updatedAt > NOW() なので since=NOW でも取得可能
    const pullRes = await getGoals(app, `since=${NOW}&clientDate=2025-01-01`);
    const pullJson = await pullRes.json();
    expect(pullJson.goals.map((g: { id: string }) => g.id)).toContain(goal.id);
  });

  test("5分以内の更新がクライアント値のまま保存される", async () => {
    const app = createApp();
    const goalId = crypto.randomUUID();

    await testDB.insert(activityGoals).values({
      id: goalId,
      userId: TEST_USER_ID,
      activityId: SEED_ACTIVITY_ID,
      dailyTargetQuantity: 10,
      startDate: "2025-01-01",
      isActive: true,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const twoMinAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const updatedGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 30,
      updatedAt: twoMinAhead,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { goals: [updatedGoal] });
    expect((await pushRes.json()).syncedIds).toContain(goalId);

    // クライアント値(NOW+2m) > NOW() → GREATESTはクライアント値を採用
    // since=NOW でも取得可能（updatedAt > NOW）
    const pullRes = await getGoals(app, `since=${NOW}&clientDate=2025-01-01`);
    const pullJson = await pullRes.json();
    const found = pullJson.goals.find((g: { id: string }) => g.id === goalId);
    expect(found).toBeDefined();
    expect(found.dailyTargetQuantity).toBe(30);
  });
});
