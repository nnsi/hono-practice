import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDatabase } = vi.hoisted(() => ({ mockGetDatabase: vi.fn() }));
vi.mock("../db/database", () => ({ getDatabase: mockGetDatabase }));

import { createSqliteTestDb } from "../db/sqliteTestHelpers";
import { scheduleId, task, today, userId } from "./scheduledStorageTestHelpers";
import { taskRepository } from "./taskRepository";
import { mapTaskRow } from "./taskRowMapper";

let db: ReturnType<typeof createSqliteTestDb>;
beforeEach(() => {
  db = createSqliteTestDb();
  mockGetDatabase.mockResolvedValue(db);
  db.sqlite
    .prepare(
      "INSERT INTO auth_state (id, user_id, last_login_at) VALUES ('current', ?, ?)",
    )
    .run(userId, today);
});
afterEach(() => db.sqlite.close());

describe("Mobile Task schedule fields", () => {
  it("creates and updates schedule links, retaining them on unrelated updates", async () => {
    const created = await taskRepository.createTask({
      title: "Task",
      scheduleId,
      scheduledDate: today,
    });
    await taskRepository.updateTask(created.id, { memo: "Retain links" });
    expect(
      await taskRepository.getTasksByScheduledDate(today, [scheduleId]),
    ).toEqual([
      expect.objectContaining({
        id: created.id,
        scheduleId,
        scheduledDate: today,
        memo: "Retain links",
      }),
    ]);
    await taskRepository.updateTask(created.id, {
      scheduledDate: "2026-09-11",
    });
    expect(await taskRepository.getTasksByScheduledDate(today)).toEqual([]);
    expect(
      await taskRepository.getTasksByScheduledDate("2026-09-11"),
    ).toHaveLength(1);
    await taskRepository.updateTask(created.id, {
      scheduleId: null,
      scheduledDate: null,
    });
    expect(await taskRepository.getTasksByScheduledDate("2026-09-11")).toEqual(
      [],
    );
  });

  it("pull upserts preserve schedule links and include deleted and archived matches", async () => {
    await taskRepository.upsertTasksFromServer([
      task,
      { ...task, id: "other-schedule", scheduleId: "other" },
      { ...task, id: "other-date", scheduledDate: "2026-09-11" },
      { ...task, id: "ordinary", scheduleId: null },
    ]);
    expect(
      await taskRepository.getTasksByScheduledDate(today, [scheduleId]),
    ).toEqual([{ ...task, _syncStatus: "synced" }]);
    expect(
      (await taskRepository.getTasksByScheduledDate(today)).map(
        (row) => row.id,
      ),
    ).toEqual(["task-1", "other-schedule"]);
    expect(await taskRepository.getTasksByScheduledDate(today, [])).toEqual([]);
    expect(
      await taskRepository.getTasksByScheduledDate(today, ["missing"]),
    ).toEqual([]);
  });

  it("accepts legacy server rows without new optional properties", async () => {
    const {
      scheduleId: _scheduleId,
      scheduledDate: _scheduledDate,
      ...legacy
    } = task;
    await taskRepository.upsertTasksFromServer([legacy]);
    expect(mapTaskRow({})).toMatchObject({
      scheduleId: null,
      scheduledDate: null,
    });
    const row = db.sqlite.prepare("SELECT * FROM tasks").get();
    expect(row && mapTaskRow(row)).toMatchObject({
      id: task.id,
      scheduleId: null,
      scheduledDate: null,
    });
  });
});
