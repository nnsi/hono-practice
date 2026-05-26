import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activityGoals } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import {
  SEED_ACTIVITY_ID,
  createApp,
  getGoals,
  makeGoal,
  postSync,
} from "./goalSyncRouteTestHelper";

const NOW = new Date().toISOString();

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

    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedGoal = makeGoal({
      id: goalId,
      dailyTargetQuantity: 20,
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { goals: [updatedGoal] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(goalId);

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

    const pullRes = await getGoals(app, `since=${NOW}&clientDate=2025-01-01`);
    const pullJson = await pullRes.json();
    const found = pullJson.goals.find((g: { id: string }) => g.id === goalId);
    expect(found).toBeDefined();
    expect(found.dailyTargetQuantity).toBe(30);
  });
});
