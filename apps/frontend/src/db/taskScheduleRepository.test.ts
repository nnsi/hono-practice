import type { Syncable } from "@packages/domain/sync/syncableRecord";
import type { TaskScheduleRecord } from "@packages/sync-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, collection } = vi.hoisted(() => {
  const collection = {
    toArray: vi.fn(async (): Promise<Syncable<TaskScheduleRecord>[]> => []),
    modify: vi.fn(),
  };
  return {
    collection,
    mockDb: {
      authState: {
        get: vi.fn(
          async (): Promise<{ userId: string } | undefined> => ({
            userId: "user-1",
          }),
        ),
      },
      taskSchedules: {
        add: vi.fn(),
        update: vi.fn(),
        bulkPut: vi.fn(),
        filter: vi.fn(() => collection),
        where: vi.fn(() => ({ anyOf: vi.fn(() => collection) })),
      },
    },
  };
});
vi.mock("./schema", () => ({ db: mockDb }));

import { taskScheduleRepository as repo } from "./taskScheduleRepository";

const input = {
  title: "walk",
  startDate: "2026-09-10",
  recurrenceType: "interval",
  intervalDays: 2,
} satisfies Parameters<typeof repo.createTaskSchedule>[0];

describe("Web taskScheduleRepository adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.toArray.mockResolvedValue([]);
    mockDb.authState.get.mockResolvedValue({ userId: "user-1" });
  });
  it("stores authenticated creations, merged updates, and tombstones", async () => {
    const row = await repo.createTaskSchedule(input);
    expect(mockDb.taskSchedules.add).toHaveBeenCalledWith(row);
    collection.toArray.mockResolvedValue([row]);
    await repo.updateTaskSchedule(row.id, { title: "updated" });
    expect(mockDb.taskSchedules.update).toHaveBeenCalledWith(
      row.id,
      expect.objectContaining({
        title: "updated",
        intervalDays: 2,
        _syncStatus: "pending",
      }),
    );
    await repo.softDeleteTaskSchedule(row.id);
    expect(mockDb.taskSchedules.update).toHaveBeenCalledWith(
      row.id,
      expect.objectContaining({
        deletedAt: expect.any(String),
        _syncStatus: "pending",
      }),
    );
  });
  it("rejects unauthenticated creation", async () => {
    mockDb.authState.get.mockResolvedValue(undefined);
    await expect(repo.createTaskSchedule(input)).rejects.toThrow(
      "userId is not set",
    );
    expect(mockDb.taskSchedules.add).not.toHaveBeenCalled();
  });
  it("wires read filters, status transitions and safe server upserts", async () => {
    const row = await repo.createTaskSchedule(input);
    await repo.getActiveTaskSchedules();
    await repo.getPendingSyncTaskSchedules();
    expect(mockDb.taskSchedules.filter).toHaveBeenCalledTimes(2);
    await repo.markTaskSchedulesSynced([row.id]);
    await repo.markTaskSchedulesFailed([row.id]);
    expect(collection.modify).toHaveBeenNthCalledWith(1, {
      _syncStatus: "synced",
    });
    expect(collection.modify).toHaveBeenNthCalledWith(2, {
      _syncStatus: "failed",
    });
    await repo.upsertTaskSchedulesFromServer([row]);
    expect(mockDb.taskSchedules.bulkPut).toHaveBeenCalledWith([
      { ...row, _syncStatus: "synced" },
    ]);
    collection.toArray.mockResolvedValue([row]);
    mockDb.taskSchedules.bulkPut.mockClear();
    await repo.upsertTaskSchedulesFromServer([row]);
    expect(mockDb.taskSchedules.bulkPut).not.toHaveBeenCalled();
  });
});
