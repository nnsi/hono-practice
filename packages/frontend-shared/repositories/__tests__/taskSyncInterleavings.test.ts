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

/**
 * E: ローカル編集 / S: 同期を呼ぶ（待たない） / D: 先頭のレスポンスを届ける /
 * T: 時間を進める
 */
const OPS = ["E", "S", "D", "T"] as const;
type Op = (typeof OPS)[number];

function sequences(length: number): Op[][] {
  if (length === 0) return [[]];
  return sequences(length - 1).flatMap((rest) =>
    OPS.map((op) => [...rest, op]),
  );
}

async function run(ops: Op[], clientLagMs: number) {
  resetServerTimeForTests();
  let now = BASE;
  vi.setSystemTime(now);
  const advance = (ms: number) => {
    now += ms;
    vi.setSystemTime(now);
  };

  const server = createFakeSyncServer<TaskRow>(() => Date.now());
  const network = createManualNetwork((chunk: TaskRow[]) => server.push(chunk));
  const { adapter, store } = createInMemoryTaskAdapter();
  const repo = newTaskRepository(adapter);
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
      syncTasks: createSyncTasks<Syncable<TaskRecord>>({
        getPendingSyncTasks: () => repo.getPendingSyncTasks(),
        postChunk: (chunk) => network.send(chunk),
        markTasksSynced: (revisions) => repo.markTasksSynced(revisions),
        markTasksFailed: (revisions) => repo.markTasksFailed(revisions),
        upsertTasksFromServer: (wins) => repo.upsertTasksFromServer(wins),
      }),
    },
    { isOnline: () => true, onOnline: () => () => {} },
  );

  // 先行するレスポンスの Date ヘッダーで決まった、遅れた推定サーバー時刻
  if (clientLagMs > 0) {
    trackServerTimeHeader(new Date(now - clientLagMs).toUTCString());
  }

  const task = await repo.createTask({ title: "v0" });
  let lastTitle = "v0";
  const inFlight: Promise<void>[] = [];

  for (const [index, op] of ops.entries()) {
    if (op === "E") {
      advance(7);
      lastTitle = `v${index + 1}`;
      await repo.updateTask(task.id, { title: lastTitle });
    } else if (op === "S") {
      inFlight.push(engine.syncTasks());
      await settle();
    } else if (op === "D") {
      advance(40);
      await network.deliverNext();
    } else {
      advance(700);
    }
    // ローカルの編集は、どの時点でも巻き戻らない
    expect(store.get(task.id)?.title).toBe(lastTitle);
  }

  // 落ち着くまで同期する
  advance(50);
  await network.deliverAll();
  await Promise.all(inFlight);
  const final = engine.syncTasks();
  await network.deliverAll();
  await final;

  return { local: store.get(task.id), remote: server.get(task.id), lastTitle };
}

describe("タスク同期: 編集・同期・応答の順序を総当たりする", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetServerTimeForTests();
  });

  it.each([
    { clientLagMs: 0, label: "推定サーバー時刻が正確" },
    { clientLagMs: 900, label: "Date ヘッダーの秒切り捨てで 900ms 遅れ" },
  ])("最後の編集がサーバーに届き、ローカルは巻き戻らない（$label）", async ({
    clientLagMs,
  }) => {
    const all = [1, 2, 3, 4, 5].flatMap(sequences);

    for (const ops of all) {
      const { local, remote, lastTitle } = await run(ops, clientLagMs);
      const where = `ops=${ops.join("")}`;

      expect(local?.title, where).toBe(lastTitle);
      expect(local?._syncStatus, where).toBe("synced");
      expect(remote?.title, where).toBe(lastTitle);
    }
  }, 60_000);
});
