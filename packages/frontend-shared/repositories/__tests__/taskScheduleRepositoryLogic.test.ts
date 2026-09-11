import { describe, expect, it } from "vitest";

import { input, setup } from "./taskScheduleTestHelpers";

describe("taskScheduleRepositoryLogic", () => {
  it("creates default fields and validates recurrence before storage", async () => {
    const { repo, adapter } = setup();
    const row = await repo.createTaskSchedule(input);
    expect(row).toMatchObject({
      userId: "user-1",
      weekdays: null,
      endDate: null,
      activityId: null,
      isActive: true,
      deletedAt: null,
      _syncStatus: "pending",
    });
    await expect(
      repo.createTaskSchedule({ ...input, intervalDays: 0 }),
    ).rejects.toThrow();
    await expect(
      repo.createTaskSchedule({ ...input, endDate: "2026-09-09" }),
    ).rejects.toThrow();
    expect(adapter.insert).toHaveBeenCalledTimes(1);
  });

  it("validates merged updates and switches recurrence atomically", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule(input);
    await repo.markTaskSchedulesSynced([row.id]);
    await expect(
      repo.updateTaskSchedule(row.id, {
        recurrenceType: "weekdays",
      }),
    ).rejects.toThrow();
    await expect(
      repo.updateTaskSchedule(row.id, { endDate: "2026-09-09" }),
    ).rejects.toThrow();
    expect(store.get(row.id)?._syncStatus).toBe("synced");
    await repo.updateTaskSchedule(row.id, {
      recurrenceType: "weekdays",
      weekdays: [1, 7],
    });
    await repo.updateTaskSchedule(row.id, {
      title: "updated",
      isActive: undefined,
    });
    expect(store.get(row.id)).toMatchObject({
      title: "updated",
      intervalDays: null,
      weekdays: [1, 7],
      _syncStatus: "pending",
    });
    await repo.updateTaskSchedule(row.id, {
      recurrenceType: "interval",
      intervalDays: 3,
    });
    expect(store.get(row.id)).toMatchObject({
      recurrenceType: "interval",
      intervalDays: 3,
      weekdays: null,
    });
  });

  it("filters active rows and includes tombstones and failed rows in pending sync", async () => {
    const { repo } = setup();
    const active = await repo.createTaskSchedule(input);
    const inactive = await repo.createTaskSchedule({
      ...input,
      isActive: false,
    });
    const deleted = await repo.createTaskSchedule(input);
    await repo.softDeleteTaskSchedule(deleted.id);
    await repo.markTaskSchedulesSynced([active.id]);
    await repo.markTaskSchedulesFailed([inactive.id]);
    expect((await repo.getActiveTaskSchedules()).map((row) => row.id)).toEqual([
      active.id,
    ]);
    expect(
      (await repo.getPendingSyncTaskSchedules()).map((row) => row.id),
    ).toEqual([inactive.id, deleted.id]);
    expect((await repo.getPendingSyncTaskSchedules())[1].deletedAt).toEqual(
      expect.any(String),
    );
  });

  it("protects pending and newer locals while applying safe tombstones", async () => {
    const { repo, store } = setup();
    const pending = await repo.createTaskSchedule(input);
    const newer = await repo.createTaskSchedule(input);
    await repo.markTaskSchedulesSynced([newer.id]);
    const old = "2000-01-01T00:00:00.000Z";
    await repo.upsertTaskSchedulesFromServer([
      { ...pending, title: "server" },
      { ...newer, updatedAt: old },
      { ...pending, id: "remote", deletedAt: old },
    ]);
    expect(store.get(pending.id)?.title).toBe("walk");
    expect(store.get(newer.id)?.updatedAt).toBe(newer.updatedAt);
    expect(store.get("remote")).toMatchObject({
      deletedAt: old,
      _syncStatus: "synced",
    });
  });

  it("keeps omitted values and clears an old activity kind when unlinking", async () => {
    const { repo, store } = setup();
    const row = await repo.createTaskSchedule({
      ...input,
      isActive: false,
      activityId: "00000000-0000-4000-8000-000000000001",
      activityKindId: "00000000-0000-4000-8000-000000000002",
    });
    await repo.updateTaskSchedule(row.id, {
      activityId: null,
      isActive: undefined,
    });
    expect(store.get(row.id)).toMatchObject({
      activityId: null,
      activityKindId: null,
      isActive: false,
    });
  });

  it("handles empty sync operations without adapter calls", async () => {
    const { repo, adapter } = setup();
    await repo.markTaskSchedulesSynced([]);
    await repo.markTaskSchedulesFailed([]);
    await repo.upsertTaskSchedulesFromServer([]);
    expect(adapter.updateSyncStatus).not.toHaveBeenCalled();
    expect(adapter.getByIds).not.toHaveBeenCalled();
    expect(adapter.bulkUpsertSynced).not.toHaveBeenCalled();
  });
});
