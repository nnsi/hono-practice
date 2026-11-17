import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import {
  createSyncEngine,
  createSyncTasks,
  resetServerTimeForTests,
  trackServerTimeHeader,
} from "@packages/sync-engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newTaskRepository } from "../taskRepositoryLogic";
import {
  createFakeSyncServer,
  createInMemoryTaskAdapter,
  createManualNetwork,
  settle,
} from "./syncRaceTestHelpers";

type TaskRow = Omit<Syncable<TaskRecord>, "_syncStatus">;

const BASE = Date.parse("2026-11-17T08:00:14.900Z");
const noop = async () => {};

function setup() {
  const server = createFakeSyncServer<TaskRow>(() => Date.now());
  const network = createManualNetwork((chunk: TaskRow[]) => server.push(chunk));
  const { adapter, store } = createInMemoryTaskAdapter();
  const repo = newTaskRepository(adapter);
  const syncTasks = createSyncTasks<Syncable<TaskRecord>>({
    getPendingSyncTasks: () => repo.getPendingSyncTasks(),
    postChunk: (chunk) => network.send(chunk),
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
  /** 同期を開始し、レスポンスを順に届けて完了まで待つ */
  const syncToCompletion = async () => {
    const done = engine.syncTasks();
    await network.deliverAll();
    await done;
  };
  return { server, network, store, repo, engine, syncToCompletion };
}

describe("タスク同期: 同期直後・同期中の編集", () => {
  beforeEach(() => {
    resetServerTimeForTests();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(BASE);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetServerTimeForTests();
  });

  it("Date ヘッダーの秒切り捨てで推定サーバー時刻が遅れていても、同期完了直後の編集が受理される", async () => {
    const { server, store, repo, syncToCompletion } = setup();
    // 14.900 に届いたレスポンスの Date は 14.000。推定サーバー時刻は 900ms 遅れる
    trackServerTimeHeader(new Date(BASE - 900).toUTCString());

    const task = await repo.createTask({ title: "作成直後に完了する" });
    await syncToCompletion();
    // サーバーは受理時に updatedAt を自分の時刻へ繰り上げる
    expect(server.get(task.id)?.updatedAt).toBe("2026-11-17T08:00:14.900Z");

    vi.setSystemTime(BASE + 150);
    await repo.updateTask(task.id, { doneDate: "2026-11-17" });
    await syncToCompletion();

    expect(server.get(task.id)?.doneDate).toBe("2026-11-17");
    expect(store.get(task.id)).toMatchObject({
      doneDate: "2026-11-17",
      _syncStatus: "synced",
    });
  });

  it("作成 → 完了 → アーカイブを続けて行い、操作ごとに同期を呼んでも編集が巻き戻らない", async () => {
    const { server, network, store, repo, engine } = setup();

    const task = await repo.createTask({ title: "作成してすぐアーカイブ" });
    const first = engine.syncTasks();
    vi.setSystemTime(BASE + 20);
    await repo.updateTask(task.id, { doneDate: "2026-11-17" });
    const second = engine.syncTasks();
    vi.setSystemTime(BASE + 40);
    await repo.archiveTask(task.id);
    const third = engine.syncTasks();

    // 負荷がかかっていてサーバーの処理が編集より後になる
    vi.setSystemTime(BASE + 500);
    await network.deliverAll();
    await Promise.all([first, second, third]);

    const local = store.get(task.id);
    expect(local?.doneDate).toBe("2026-11-17");
    expect(local?.archivedAt).not.toBeNull();
    expect(local?._syncStatus).toBe("synced");
    expect(server.get(task.id)?.doneDate).toBe("2026-11-17");
    expect(server.get(task.id)?.archivedAt).toBe(local?.archivedAt);
  });

  it("push の応答待ち中に編集した行は synced にならず、次の同期でサーバーに届く", async () => {
    const { server, network, store, repo, engine, syncToCompletion } = setup();

    const task = await repo.createTask({ title: "同期中に編集する" });
    const inFlight = engine.syncTasks();
    await settle();
    expect(network.inFlight()).toBe(1);

    vi.setSystemTime(BASE + 30);
    await repo.updateTask(task.id, { doneDate: "2026-11-17" });

    vi.setSystemTime(BASE + 400);
    await network.deliverAll();
    await inFlight;

    expect(store.get(task.id)).toMatchObject({
      doneDate: "2026-11-17",
      _syncStatus: "pending",
    });

    await syncToCompletion();

    expect(server.get(task.id)?.doneDate).toBe("2026-11-17");
    expect(store.get(task.id)).toMatchObject({
      doneDate: "2026-11-17",
      _syncStatus: "synced",
    });
  });

  it("別端末がサーバーへ書いた新しい版は、古いローカル編集で上書きされない", async () => {
    const { server, store, repo, syncToCompletion } = setup();

    const task = await repo.createTask({ title: "元のタイトル" });
    await syncToCompletion();

    // オフライン中のローカル編集（まだ push していない）
    vi.setSystemTime(BASE + 1_000);
    await repo.updateTask(task.id, { title: "古いローカル編集" });
    const { _syncStatus, ...localRow } = store.get(task.id)!;

    // その後に別端末の編集がサーバーへ届く
    vi.setSystemTime(BASE + 60_000);
    server.put({
      ...localRow,
      title: "別端末の編集",
      updatedAt: new Date(BASE + 60_000).toISOString(),
    });

    await syncToCompletion();

    expect(server.get(task.id)?.title).toBe("別端末の編集");
  });
});
