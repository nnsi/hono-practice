import { afterEach, describe, expect, it } from "vitest";

import { SCHEMA_VERSION, migrateDb } from "./migrations";
import { createSqliteTestDb } from "./sqliteTestHelpers";

let db: ReturnType<typeof createSqliteTestDb> | undefined;
afterEach(() => db?.sqlite.close());

describe("SQLite scheduled tasks migration", () => {
  it("upgrades an existing v12 database, preserves tasks and adds nullable columns", async () => {
    db = createSqliteTestDb(12);
    db.sqlite.exec(`INSERT INTO tasks (id, title, created_at, updated_at)
      VALUES ('old', 'Existing task', '2026-09-01', '2026-09-01')`);
    await migrateDb(db);
    expect(
      db.sqlite
        .prepare("SELECT id, title, schedule_id, scheduled_date FROM tasks")
        .get(),
    ).toEqual({
      id: "old",
      title: "Existing task",
      schedule_id: null,
      scheduled_date: null,
    });
    expect(db.sqlite.prepare("PRAGMA user_version").get()).toEqual({
      user_version: SCHEMA_VERSION,
    });
    expect(
      db.sqlite
        .prepare("PRAGMA index_info(idx_tasks_schedule_id_scheduled_date)")
        .all()
        .map((row) => row.name),
    ).toEqual(["schedule_id", "scheduled_date"]);
    expect(db.sqlite.prepare("SELECT * FROM task_schedules").all()).toEqual([]);
    db.execAsync.mockClear();
    await migrateDb(db);
    expect(db.execAsync).not.toHaveBeenCalled();
  });

  it.each([
    "columns",
    "version",
  ])("rolls back a %s failure and retries v13 safely", async (failurePoint) => {
    const testDb = createSqliteTestDb(12);
    db = testDb;
    testDb.sqlite.exec(`INSERT INTO tasks (id, title, created_at, updated_at)
      VALUES ('old', 'Existing task', '2026-09-01', '2026-09-01')`);
    let failOnce = true;
    testDb.execAsync.mockImplementation(async (sql: string) => {
      if (
        failOnce &&
        failurePoint === "columns" &&
        sql.includes("ADD COLUMN scheduled_date")
      ) {
        failOnce = false;
        testDb.sqlite.exec(
          sql.replace(
            "ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;",
            "SELECT missing_migration_function();",
          ),
        );
      } else if (
        failOnce &&
        failurePoint === "version" &&
        sql.startsWith("PRAGMA user_version =")
      ) {
        failOnce = false;
        throw new Error("version write failed");
      } else {
        testDb.sqlite.exec(sql);
      }
    });
    await expect(migrateDb(testDb)).rejects.toThrow();
    expect(testDb.execAsync).toHaveBeenCalledWith("ROLLBACK");
    expect(testDb.sqlite.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 12,
    });
    expect(
      testDb.sqlite
        .prepare("PRAGMA table_info(tasks)")
        .all()
        .map((row) => row.name),
    ).not.toContain("schedule_id");
    expect(
      testDb.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = 'task_schedules'")
        .all(),
    ).toEqual([]);
    await migrateDb(testDb);
    expect(testDb.sqlite.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 13,
    });
    expect(
      testDb.sqlite
        .prepare("SELECT id, schedule_id, scheduled_date FROM tasks")
        .get(),
    ).toEqual({ id: "old", schedule_id: null, scheduled_date: null });
  });

  it("initializes a fresh database through every migration", async () => {
    db = createSqliteTestDb(0);
    await migrateDb(db);
    expect(
      db.sqlite
        .prepare("PRAGMA table_info(task_schedules)")
        .all()
        .map((row) => row.name),
    ).toEqual(
      expect.arrayContaining([
        "id",
        "weekdays",
        "recurrence_type",
        "sync_status",
      ]),
    );
    expect(db.sqlite.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 13,
    });
  });
});
