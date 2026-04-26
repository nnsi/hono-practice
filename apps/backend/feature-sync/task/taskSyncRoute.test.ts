import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { tasks } from "@infra/drizzle/schema";
import { describe, expect, test } from "vitest";

import { taskSyncRoute } from "./taskSyncRoute";

const SEED_TASK_ID_1 = "00000000-0000-4000-8000-000000000001";
const SEED_TASK_ID_2 = "00000000-0000-4000-8000-000000000002";

const NOW = new Date().toISOString();

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "Test task",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", taskSyncRoute);
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/tasks/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function getTasks(app: ReturnType<typeof createApp>, query = "") {
  return app.request(
    `/users/v2/tasks${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

describe("POST /users/v2/tasks/sync", () => {
  test("新規タスクの同期", async () => {
    const app = createApp();
    const newTask = makeTask();

    const res = await postSync(app, { tasks: [newTask] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(newTask.id);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("既存タスクの更新 (LWW - クライアント勝利)", async () => {
    const app = createApp();
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedTask = makeTask({
      id: SEED_TASK_ID_1,
      title: "updated title",
      memo: "updated memo",
      updatedAt: futureDate,
    });

    const res = await postSync(app, { tasks: [updatedTask] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(SEED_TASK_ID_1);
    expect(json.serverWins).toHaveLength(0);
  });

  test("serverWins - サーバー側が新しい場合", async () => {
    const app = createApp();
    const oldTask = makeTask({
      id: SEED_TASK_ID_1,
      title: "old title",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, { tasks: [oldTask] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).not.toContain(SEED_TASK_ID_1);
    expect(json.serverWins).toHaveLength(1);
    expect(json.serverWins[0].id).toBe(SEED_TASK_ID_1);
  });

  test("バリデーションエラー - 必須フィールド欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {
      tasks: [{ id: "not-a-uuid" }],
    });
    expect(res.status).toBe(400);
  });

  test("バリデーションエラー - タイトルが空文字", async () => {
    const app = createApp();
    const res = await postSync(app, {
      tasks: [makeTask({ title: "" })],
    });
    expect(res.status).toBe(400);
  });

  test("バリデーションエラー - activityKindIdにactivityIdが必要", async () => {
    const app = createApp();
    const res = await postSync(app, {
      tasks: [
        makeTask({
          activityId: null,
          activityKindId: "00000000-0000-4000-8000-000000000001",
        }),
      ],
    });
    expect(res.status).toBe(400);
  });

  test("複数タスクの一括同期", async () => {
    const app = createApp();
    const tasks = [
      makeTask({ id: "10000000-0000-4000-8000-000000000001", title: "Task 1" }),
      makeTask({ id: "10000000-0000-4000-8000-000000000002", title: "Task 2" }),
      makeTask({ id: "10000000-0000-4000-8000-000000000003", title: "Task 3" }),
    ];

    const res = await postSync(app, { tasks });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(3);
    for (const task of tasks) {
      expect(json.syncedIds).toContain(task.id);
    }
  });

  test("空配列の同期", async () => {
    const app = createApp();
    const res = await postSync(app, { tasks: [] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(0);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("max 100 バリデーション - 101件で400", async () => {
    const app = createApp();
    const tasks = Array.from({ length: 101 }, (_, i) =>
      makeTask({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        title: `Task ${i}`,
      }),
    );

    const res = await postSync(app, { tasks });
    expect(res.status).toBe(400);
  });

  test("max 100 バリデーション - ちょうど100件でOK", async () => {
    const app = createApp();
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        title: `Task ${i}`,
      }),
    );

    const res = await postSync(app, { tasks });
    expect(res.status).toBe(200);
  });

  test("バリデーションエラー - tasksキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {});
    expect(res.status).toBe(400);
  });
});

describe("GET /users/v2/tasks", () => {
  test("全件取得", async () => {
    const app = createApp();
    const res = await getTasks(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.tasks).toHaveLength(2);
    const ids = json.tasks.map((t: { id: string }) => t.id);
    expect(ids).toContain(SEED_TASK_ID_1);
    expect(ids).toContain(SEED_TASK_ID_2);
  });

  test("since パラメータでフィルタリング", async () => {
    const app = createApp();

    // 未来の日時を指定 → 結果は0件
    const res = await getTasks(app, "since=2099-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.tasks).toHaveLength(0);
  });
});

describe("clock skew handling - 時計が遅いケース", () => {
  test("新規のupdatedAtがNOW()に引き上がりpull可能", async () => {
    const app = createApp();
    const beforePush = new Date(Date.now() - 1000).toISOString();

    const task = makeTask({
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { tasks: [task] });
    expect(pushRes.status).toBe(200);
    expect((await pushRes.json()).syncedIds).toContain(task.id);

    // fix-up により updatedAt >= NOW() → beforePush 以降の since で取得可能
    const pullRes = await getTasks(app, `since=${beforePush}`);
    const pullJson = await pullRes.json();
    expect(pullJson.tasks.map((r: { id: string }) => r.id)).toContain(task.id);
  });

  test("既存レコードの更新でupdatedAtがGREATESTで引き上がりpull可能", async () => {
    const app = createApp();
    const taskId = crypto.randomUUID();

    // DB直接挿入: fix-upを経由しない既知のupdatedAtを持つレコード
    await testDB.insert(tasks).values({
      id: taskId,
      userId: TEST_USER_ID,
      title: "Original",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const beforeUpdate = new Date(Date.now() - 1000).toISOString();

    // DBより新しいがNOW()より古い updatedAt で更新（時計遅れを再現）
    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedTask = makeTask({
      id: taskId,
      title: "Updated from slow-clock device",
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { tasks: [updatedTask] });
    const pushJson = await pushRes.json();
    // LWW: DB(2020) < client(2023) → client wins
    expect(pushJson.syncedIds).toContain(taskId);

    // SET GREATEST(2023, NOW()) = NOW() → pull可能
    const pullRes = await getTasks(app, `since=${beforeUpdate}`);
    const pullJson = await pullRes.json();
    const found = pullJson.tasks.find((r: { id: string }) => r.id === taskId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Updated from slow-clock device");
  });

  test("古い更新はserver winsを維持（LWW不変）", async () => {
    const app = createApp();

    const oldTask = makeTask({
      id: SEED_TASK_ID_1,
      title: "old title",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { tasks: [oldTask] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).not.toContain(SEED_TASK_ID_1);
    expect(pushJson.serverWins).toHaveLength(1);
    expect(pushJson.serverWins[0].id).toBe(SEED_TASK_ID_1);
  });
});

describe("clock skew handling - 時計が早いケース", () => {
  test("5分以内の新規レコードが同期・pull可能", async () => {
    const app = createApp();
    const threeMinAhead = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const task = makeTask({ updatedAt: threeMinAhead });

    const pushRes = await postSync(app, { tasks: [task] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(task.id);
    expect(pushJson.skippedIds).toHaveLength(0);

    // updatedAt > NOW() なので since=NOW でも取得可能
    const pullRes = await getTasks(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    expect(pullJson.tasks.map((r: { id: string }) => r.id)).toContain(task.id);
  });

  test("5分以内の更新がクライアント値のまま保存される", async () => {
    const app = createApp();
    const taskId = crypto.randomUUID();

    await testDB.insert(tasks).values({
      id: taskId,
      userId: TEST_USER_ID,
      title: "Original",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const twoMinAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const updatedTask = makeTask({
      id: taskId,
      title: "Updated from fast-clock device",
      updatedAt: twoMinAhead,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { tasks: [updatedTask] });
    expect((await pushRes.json()).syncedIds).toContain(taskId);

    // クライアント値(NOW+2m) > NOW() → GREATESTはクライアント値を採用
    // since=NOW でも取得可能（updatedAt > NOW）
    const pullRes = await getTasks(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    const found = pullJson.tasks.find((r: { id: string }) => r.id === taskId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Updated from fast-clock device");
  });
});
