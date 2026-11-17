import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { tasks } from "@infra/drizzle/schema";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { newTaskRepository } from "@packages/frontend-shared/repositories";
import { createInMemoryTaskAdapter } from "@packages/frontend-shared/repositories/__tests__/syncRaceTestHelpers";
import {
  createSyncEngine,
  createSyncTasks,
  resetServerTimeForTests,
  trackServerTimeHeader,
} from "@packages/sync-engine";
import { parseSyncResult } from "@packages/sync-engine/core/parseSyncResult";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { taskSyncRoute } from "./taskSyncRoute";

const noop = async () => {};

/**
 * Web / Mobile 共通のクライアント同期ロジック（frontend-shared の repository と
 * sync-engine の push）を、実際の同期 API と DB に対して動かす。
 */
function createClient() {
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", taskSyncRoute);
  const { adapter, store } = createInMemoryTaskAdapter();
  const repo = newTaskRepository(adapter);
  const syncTasks = createSyncTasks<Syncable<TaskRecord>>({
    getPendingSyncTasks: () => repo.getPendingSyncTasks(),
    postChunk: async (chunk) => {
      const res = await app.request(
        "/users/v2/tasks/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: chunk }),
        },
        { DB: testDB },
      );
      expect(res.status).toBe(200);
      return parseSyncResult(await res.json());
    },
    markTasksSynced: (revisions) => repo.markTasksSynced(revisions),
    markTasksFailed: (revisions) => repo.markTasksFailed(revisions),
    upsertTasksFromServer: (wins) => repo.upsertTasksFromServer(wins),
  });
  const engine = createSyncEngine(
    {
      syncActivityIconDeletions: noop,
      syncActivities: noop,
      syncActivityIcons: noop,
      syncActivityLogs: noop,
      syncGoals: noop,
      syncGoalFreezePeriods: noop,
      syncNotes: noop,
      syncTaskSchedules: noop,
      syncTasks,
    },
    { isOnline: () => true, onOnline: () => () => {} },
  );
  return { store, repo, engine };
}

async function getServerTask(id: string) {
  const [row] = await testDB.select().from(tasks).where(eq(tasks.id, id));
  return row;
}

describe("タスク同期: クライアントの推定サーバー時刻が遅れている場合", () => {
  beforeEach(() => {
    resetServerTimeForTests();
    // Date ヘッダーの秒切り捨てや端末時計のずれで、クライアントが付ける時刻が
    // サーバーの NOW() より遅れている状態を固定する
    trackServerTimeHeader(new Date(Date.now() - 5_000).toUTCString());
  });

  afterEach(() => {
    resetServerTimeForTests();
  });

  test("作成の同期が完了した直後の編集がサーバーに受理される", async () => {
    const { store, repo, engine } = createClient();

    const task = await repo.createTask({ title: "作成直後に完了する" });
    await engine.syncTasks();
    await repo.updateTask(task.id, { doneDate: "2026-11-17" });
    await engine.syncTasks();

    expect((await getServerTask(task.id))?.doneDate).toBe("2026-11-17");
    expect(store.get(task.id)).toMatchObject({
      doneDate: "2026-11-17",
      _syncStatus: "synced",
    });
  });

  test("作成 → 完了 → アーカイブを続けて行い、操作ごとに同期を呼んでも編集が巻き戻らない", async () => {
    const { store, repo, engine } = createClient();

    const task = await repo.createTask({ title: "作成してすぐアーカイブ" });
    const first = engine.syncTasks();
    await repo.updateTask(task.id, { doneDate: "2026-11-17" });
    const second = engine.syncTasks();
    await repo.archiveTask(task.id);
    const third = engine.syncTasks();
    await Promise.all([first, second, third]);

    const local = store.get(task.id);
    expect(local?.doneDate).toBe("2026-11-17");
    expect(local?.archivedAt).not.toBeNull();
    expect(local?._syncStatus).toBe("synced");

    const remote = await getServerTask(task.id);
    expect(remote?.doneDate).toBe("2026-11-17");
    expect(remote?.archivedAt?.toISOString()).toBe(local?.archivedAt);
  });
});
