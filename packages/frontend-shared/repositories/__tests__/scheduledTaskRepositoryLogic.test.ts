import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { describe, expect, it, vi } from "vitest";

import { type TaskDbAdapter, newTaskRepository } from "../taskRepositoryLogic";

function setup() {
  const records: Syncable<TaskRecord>[] = [];
  const adapter: TaskDbAdapter = {
    getUserId: async () => "user-1",
    insert: async (task) => {
      records.push(task);
    },
    getAll: vi.fn(async (filter) => records.filter(filter)),
    update: async () => {},
    getByIds: async () => [],
    updateSyncStatus: async () => {},
    bulkUpsertSynced: async () => {},
  };
  return { records, adapter, repo: newTaskRepository(adapter) };
}

describe("scheduled Task repository fallback", () => {
  it("reads all matching rows including tombstones without indexed adapter support", async () => {
    const { repo, records, adapter } = setup();
    const base = await repo.createTask({
      title: "walk",
      scheduleId: "s1",
      scheduledDate: "2026-09-10",
    });
    records.push({ ...base, id: "deleted", deletedAt: "2026-09-10T00:00:00Z" });
    records.push({
      ...base,
      id: "archived",
      scheduleId: "s2",
      archivedAt: "2026-09-10T00:00:00Z",
    });
    records.push({ ...base, id: "later", scheduledDate: "2026-09-11" });
    records.push({ ...base, id: "ordinary", scheduleId: null });
    expect(
      (await repo.getTasksByScheduledDate("2026-09-10")).map((row) => row.id),
    ).toEqual([base.id, "deleted", "archived"]);
    expect(
      (await repo.getTasksByScheduledDate("2026-09-10", ["s1"])).map(
        (row) => row.id,
      ),
    ).toEqual([base.id, "deleted"]);
    expect(await repo.getTasksByScheduledDate("2026-09-10", [])).toEqual([]);
    expect(adapter.getAll).toHaveBeenCalledTimes(2);
  });

  it("prefers the platform indexed query and bypasses both queries for empty IDs", async () => {
    const { adapter } = setup();
    const getByScheduledDate = vi.fn(async () => []);
    const repo = newTaskRepository({ ...adapter, getByScheduledDate });
    await repo.getTasksByScheduledDate("2026-09-10", ["s1"]);
    expect(getByScheduledDate).toHaveBeenCalledWith("2026-09-10", ["s1"]);
    await repo.getTasksByScheduledDate("2026-09-10", []);
    expect(getByScheduledDate).toHaveBeenCalledTimes(1);
    expect(adapter.getAll).not.toHaveBeenCalled();
  });
});
