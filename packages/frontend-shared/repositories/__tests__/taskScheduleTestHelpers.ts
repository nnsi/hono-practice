import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { taskScheduleDataSchema } from "@packages/domain/taskSchedule";
import type { TaskScheduleRecord } from "@packages/sync-engine";
import { vi } from "vitest";

import {
  type TaskScheduleDbAdapter,
  newTaskScheduleRepository,
} from "../taskScheduleRepositoryLogic";

export function setup() {
  const store = new Map<string, Syncable<TaskScheduleRecord>>();
  const adapter: TaskScheduleDbAdapter = {
    getUserId: vi.fn(async () => "user-1"),
    insert: vi.fn(async (row) => {
      store.set(row.id, row);
    }),
    getAll: vi.fn(async (filter) => [...store.values()].filter(filter)),
    update: vi.fn(async (id, changes) => {
      const current = store.get(id);
      if (current) {
        const merged = { ...current, ...changes };
        store.set(id, { ...merged, ...taskScheduleDataSchema.parse(merged) });
      }
    }),
    getByIds: vi.fn(async (ids) =>
      [...store.values()].filter((row) => ids.includes(row.id)),
    ),
    updateSyncStatus: vi.fn(async (revisions, status) => {
      for (const revision of revisions) {
        const row = store.get(revision.id);
        if (row && row.updatedAt === revision.updatedAt) {
          store.set(revision.id, { ...row, _syncStatus: status });
        }
      }
    }),
    bulkUpsertSynced: vi.fn(async (rows) => {
      for (const row of rows) store.set(row.id, row);
    }),
  };
  let id = 0;
  return {
    store,
    adapter,
    repo: newTaskScheduleRepository(adapter, () => `schedule-${++id}`),
  };
}
export const input = {
  title: "walk",
  startDate: "2026-09-10",
  recurrenceType: "interval",
  intervalDays: 2,
} satisfies Parameters<
  ReturnType<typeof newTaskScheduleRepository>["createTaskSchedule"]
>[0];
