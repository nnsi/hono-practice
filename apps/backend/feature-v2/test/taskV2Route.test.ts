import { Hono } from "hono";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, test } from "vitest";

import { taskV2Route } from "../taskV2Route";

const SEED_TASK_ID_1 = "00000000-0000-4000-8000-000000000001";
const SEED_TASK_ID_2 = "00000000-0000-4000-8000-000000000002";

const NOW = new Date().toISOString();

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
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
  return new Hono()
    .use(mockAuthMiddleware)
    .route("/users/v2", taskV2Route);
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

async function getTasks(
  app: ReturnType<typeof createApp>,
  query = "",
) {
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
