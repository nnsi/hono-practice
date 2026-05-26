import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activityLogs } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import {
  SEED_ACTIVITY_ID,
  createApp,
  getGoals,
  makeGoal,
  postSync,
} from "./goalSyncRouteTestHelper";

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

  test("複数ゴールのtotalActualを1クエリで集計（N+1解消）", async () => {
    // 異なる endDate を持つ複数ゴール + activity_log を用意して、SUM が
    // LEAST(today, endDate) で正しく分かれて返ることを確認する。
    const app = createApp();
    const goalA = "10000000-0000-4000-8000-000000000080";
    const goalB = "10000000-0000-4000-8000-000000000081";

    await postSync(app, {
      goals: [
        // goalA: 2026-03-01 〜 2026-03-05（過去で終了 → endDateで打ち切り）
        makeGoal({
          id: goalA,
          startDate: "2026-03-01",
          endDate: "2026-03-05",
          dailyTargetQuantity: 10,
        }),
        // goalB: 2026-03-01 〜 endDate=null（無期限 → today まで）
        makeGoal({
          id: goalB,
          startDate: "2026-03-01",
          endDate: null,
          dailyTargetQuantity: 10,
        }),
      ],
    });

    const logsToInsert = Array.from({ length: 10 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 100).padStart(12, "0")}`,
      userId: TEST_USER_ID,
      activityId: SEED_ACTIVITY_ID,
      activityKindId: null,
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      quantity: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await testDB.insert(activityLogs).values(logsToInsert);

    const res = await getGoals(app, "clientDate=2026-03-10");
    expect(res.status).toBe(200);
    const json = await res.json();
    const a = json.goals.find((g: { id: string }) => g.id === goalA);
    const b = json.goals.find((g: { id: string }) => g.id === goalB);
    // goalA: 3/1〜3/5 (5日 × 5 = 25)
    expect(a.totalActual).toBe(25);
    // goalB: 3/1〜3/10 (10日 × 5 = 50)
    expect(b.totalActual).toBe(50);
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

  test("不正な clientDate (YYYY-MM-DD 以外) は 400 を返す", async () => {
    const app = createApp();
    const res = await getGoals(app, "clientDate=not-a-date");
    expect(res.status).toBe(400);
  });

  test("不正な since (ISO datetime 以外) は 400 を返す", async () => {
    const app = createApp();
    const res = await getGoals(app, "since=2026/03/29");
    expect(res.status).toBe(400);
  });
});
