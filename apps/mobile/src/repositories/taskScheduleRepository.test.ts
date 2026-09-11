import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDatabase } = vi.hoisted(() => ({ mockGetDatabase: vi.fn() }));
vi.mock("../db/database", () => ({ getDatabase: mockGetDatabase }));
vi.mock("../db/dbEvents", () => ({ dbEvents: { emit: vi.fn() } }));

import { dbEvents } from "../db/dbEvents";
import { createSqliteTestDb } from "../db/sqliteTestHelpers";
import {
  schedule,
  scheduleId,
  today,
  userId,
} from "./scheduledStorageTestHelpers";
import { taskScheduleRepository } from "./taskScheduleRepository";
import { mapTaskScheduleRow } from "./taskScheduleRowMapper";

let db: ReturnType<typeof createSqliteTestDb>;
beforeEach(() => {
  vi.clearAllMocks();
  db = createSqliteTestDb();
  mockGetDatabase.mockResolvedValue(db);
  db.sqlite
    .prepare(
      "INSERT INTO auth_state (id, user_id, last_login_at) VALUES ('current', ?, ?)",
    )
    .run(userId, today);
});
afterEach(() => db.sqlite.close());

describe("Mobile task schedule repository", () => {
  it("round trips server weekdays, nullable values and sync status through SQLite", async () => {
    await taskScheduleRepository.upsertTaskSchedulesFromServer([schedule]);
    expect(await taskScheduleRepository.getActiveTaskSchedules()).toEqual([
      { ...schedule, _syncStatus: "synced" },
    ]);
    const row = db.sqlite.prepare("SELECT * FROM task_schedules").get();
    expect(row?.weekdays).toBe("[1,4,7]");
    expect(dbEvents.emit).toHaveBeenCalledWith("task_schedules");
    expect(db.execAsync).toHaveBeenCalledWith("BEGIN");
    expect(db.execAsync).toHaveBeenCalledWith("COMMIT");
  });

  it("creates, updates recurrence, changes sync state and soft deletes", async () => {
    const created = await taskScheduleRepository.createTaskSchedule({
      title: "Local",
      startDate: today,
      recurrenceType: "interval",
      intervalDays: 2,
    });
    expect(created).toMatchObject({
      userId,
      _syncStatus: "pending",
      weekdays: null,
    });
    await taskScheduleRepository.updateTaskSchedule(created.id, {
      recurrenceType: "weekdays",
      weekdays: [2, 5],
    });
    expect(await taskScheduleRepository.getPendingSyncTaskSchedules()).toEqual([
      expect.objectContaining({
        recurrenceType: "weekdays",
        weekdays: [2, 5],
        intervalDays: null,
      }),
    ]);
    await taskScheduleRepository.markTaskSchedulesFailed([created.id]);
    expect(
      (await taskScheduleRepository.getPendingSyncTaskSchedules())[0]
        ?._syncStatus,
    ).toBe("failed");
    await taskScheduleRepository.markTaskSchedulesSynced([created.id]);
    expect(await taskScheduleRepository.getPendingSyncTaskSchedules()).toEqual(
      [],
    );
    await taskScheduleRepository.softDeleteTaskSchedule(created.id);
    expect(await taskScheduleRepository.getActiveTaskSchedules()).toEqual([]);
    expect(await taskScheduleRepository.getPendingSyncTaskSchedules()).toEqual([
      expect.objectContaining({
        deletedAt: expect.any(String),
        _syncStatus: "pending",
      }),
    ]);
  });

  it("does not overwrite pending or newer local records during pull", async () => {
    await taskScheduleRepository.upsertTaskSchedulesFromServer([schedule]);
    await taskScheduleRepository.updateTaskSchedule(scheduleId, {
      title: "Local",
    });
    await taskScheduleRepository.upsertTaskSchedulesFromServer([
      { ...schedule, title: "Stale" },
    ]);
    expect(
      (await taskScheduleRepository.getActiveTaskSchedules())[0]?.title,
    ).toBe("Local");
    await taskScheduleRepository.markTaskSchedulesSynced([scheduleId]);
    await taskScheduleRepository.upsertTaskSchedulesFromServer([
      { ...schedule, title: "Stale" },
    ]);
    expect(
      (await taskScheduleRepository.getActiveTaskSchedules())[0]?.title,
    ).toBe("Local");
  });

  it("excludes inactive rows and rolls back a failed batch", async () => {
    await taskScheduleRepository.upsertTaskSchedulesFromServer([
      { ...schedule, isActive: false },
    ]);
    expect(await taskScheduleRepository.getActiveTaskSchedules()).toEqual([]);
    db.runAsync.mockRejectedValueOnce(new Error("write failed"));
    await expect(
      taskScheduleRepository.upsertTaskSchedulesFromServer([
        { ...schedule, id: "00000000-0000-4000-8000-000000000003" },
      ]),
    ).rejects.toThrow("write failed");
    expect(db.execAsync).toHaveBeenCalledWith("ROLLBACK");
    expect(
      db.sqlite.prepare("SELECT COUNT(*) AS count FROM task_schedules").get()
        ?.count,
    ).toBe(1);
  });

  it.each([
    ["weekday out of range", { recurrence_type: "weekdays", weekdays: "[8]" }],
    ["unknown recurrence type", { recurrence_type: "monthly", weekdays: null }],
    ["non-JSON weekdays", { recurrence_type: "weekdays", weekdays: "oops" }],
  ])("maps malformed persisted recurrence (%s) to null", (_, row) => {
    expect(mapTaskScheduleRow(row)).toBeNull();
  });

  it("skips malformed rows so the remaining schedules still load", async () => {
    await taskScheduleRepository.upsertTaskSchedulesFromServer([schedule]);
    db.sqlite
      .prepare(
        "UPDATE task_schedules SET recurrence_type = 'monthly' WHERE id = ?",
      )
      .run(scheduleId);
    const validId = "00000000-0000-4000-8000-000000000009";
    await taskScheduleRepository.upsertTaskSchedulesFromServer([
      { ...schedule, id: validId },
    ]);

    const active = await taskScheduleRepository.getActiveTaskSchedules();
    expect(active.map((s) => s.id)).toEqual([validId]);
  });
});
