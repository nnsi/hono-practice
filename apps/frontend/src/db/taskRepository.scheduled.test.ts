import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rows, mockDb } = vi.hoisted(() => {
  const rows = new Map<string, Syncable<TaskRecord>>();
  const mockDb = {
    authState: { get: vi.fn(async () => ({ userId: "user-1" })) },
    tasks: {
      add: vi.fn(async (row: Syncable<TaskRecord>) => {
        rows.set(row.id, row);
      }),
      update: vi.fn(
        async (id: string, changes: Partial<Syncable<TaskRecord>>) => {
          const row = rows.get(id);
          if (row) rows.set(id, { ...row, ...changes });
        },
      ),
      filter: vi.fn((filter: (row: Syncable<TaskRecord>) => boolean) => ({
        toArray: async () => [...rows.values()].filter(filter),
      })),
      where: vi.fn((index: string) => ({
        anyOf: (keys: string[] | string[][]) => ({
          toArray: async () =>
            [...rows.values()].filter((row) =>
              keys.some((key) =>
                index === "id"
                  ? key === row.id
                  : Array.isArray(key) &&
                    key[0] === row.scheduleId &&
                    key[1] === row.scheduledDate,
              ),
            ),
        }),
      })),
      bulkPut: vi.fn(async (records: Syncable<TaskRecord>[]) => {
        for (const row of records) rows.set(row.id, row);
      }),
    },
  };
  return { rows, mockDb };
});
vi.mock("./schema", () => ({ db: mockDb }));

import { taskRepository } from "./taskRepository";

describe("scheduled Task rows", () => {
  beforeEach(() => {
    rows.clear();
    vi.clearAllMocks();
  });

  it("persists schedule fields through creation, update and server upsert", async () => {
    const row = await taskRepository.createTask({
      title: "walk",
      scheduleId: "s1",
      scheduledDate: "2026-09-10",
    });
    expect(rows.get(row.id)).toMatchObject({
      scheduleId: "s1",
      scheduledDate: "2026-09-10",
    });
    await taskRepository.updateTask(row.id, {
      scheduleId: "s2",
      scheduledDate: "2026-09-11",
    });
    expect(rows.get(row.id)).toMatchObject({
      scheduleId: "s2",
      scheduledDate: "2026-09-11",
    });
    await taskRepository.upsertTasksFromServer([
      { ...row, id: "remote", scheduleId: "s3" },
    ]);
    expect(rows.get("remote")).toMatchObject({
      scheduleId: "s3",
      scheduledDate: "2026-09-10",
      _syncStatus: "synced",
    });
  });

  it("includes deleted and archived rows using compound index for specified schedules", async () => {
    const row = await taskRepository.createTask({
      title: "walk",
      scheduleId: "s1",
      scheduledDate: "2026-09-10",
    });
    const archived = await taskRepository.createTask({
      title: "run",
      scheduleId: "s2",
      scheduledDate: "2026-09-10",
    });
    await taskRepository.softDeleteTask(row.id);
    await taskRepository.archiveTask(archived.id);
    await taskRepository.createTask({
      title: "later",
      scheduleId: "s1",
      scheduledDate: "2026-09-11",
    });
    expect(
      (
        await taskRepository.getTasksByScheduledDate("2026-09-10", ["s1", "s2"])
      ).map((task) => task.id),
    ).toEqual([row.id, archived.id]);
    expect(mockDb.tasks.where).toHaveBeenCalledWith(
      "[scheduleId+scheduledDate]",
    );
    expect(
      (await taskRepository.getTasksByScheduledDate("2026-09-10", ["s1"])).map(
        (task) => task.id,
      ),
    ).toEqual([row.id]);
    expect(
      (await taskRepository.getTasksByScheduledDate("2026-09-10")).map(
        (task) => task.id,
      ),
    ).toEqual([row.id, archived.id]);
    expect(
      await taskRepository.getTasksByScheduledDate("2026-09-10", []),
    ).toEqual([]);
  });

  it("keeps legacy rows without schedule fields readable and updateable", async () => {
    const row = await taskRepository.createTask({ title: "legacy" });
    expect(row.scheduleId).toBeNull();
    expect(row.scheduledDate).toBeNull();
    const {
      scheduleId: _scheduleId,
      scheduledDate: _scheduledDate,
      ...legacy
    } = row;
    rows.set(row.id, legacy);
    expect(await taskRepository.getAllActiveTasks()).toEqual([legacy]);
    expect(await taskRepository.getTasksByScheduledDate("2026-09-10")).toEqual(
      [],
    );
    await taskRepository.updateTask(row.id, { title: "edited legacy" });
    expect(rows.get(row.id)?.title).toBe("edited legacy");
  });
});
