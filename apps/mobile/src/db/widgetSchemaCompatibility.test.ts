import { readFileSync } from "node:fs";
import type { SQLInputValue } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  MINIMUM_WIDGET_SCHEMA_VERSION,
  SCHEMA_VERSION,
  WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION,
  migrateDb,
} from "./migrations";
import { createSqliteTestDb } from "./sqliteTestHelpers";

const swiftDirectory = new URL("../../targets/widget/", import.meta.url);
const kotlinDirectory = new URL(
  "../../modules/timer-widget/android/src/main/java/com/actiko/widget/",
  import.meta.url,
);

function readNative(directory: URL, file: string) {
  return readFileSync(new URL(file, directory), "utf8");
}

// Read the shipped queries instead of copying their SQL into this test.
function nativeStrings(source: string) {
  return [...source.matchAll(/"""([\s\S]*?)"""|"((?:[^"\\]|\\.)*)"/g)].map(
    (match) =>
      (match[1] ?? match[2])
        .replace(/\\\r?\n\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
  );
}

function nativeSql(source: string, pattern: RegExp) {
  const matches = nativeStrings(source).filter((sql) => pattern.test(sql));
  expect(
    matches,
    `expected one native SQL string matching ${pattern}`,
  ).toHaveLength(1);
  return matches[0];
}

function androidMethod(source: string, name: string) {
  const start = new RegExp(`\\bfun (?:WidgetDbHelper\\.)?${name}\\(`).exec(
    source,
  );
  if (!start) throw new Error(`Native method ${name} not found`);
  return source.slice(start.index).split(/\n\s*fun /)[0];
}

// Android builds writes through ContentValues. Use its actual column names and
// table/WHERE strings to form the equivalent SQLite statement.
function androidWrite(
  source: string,
  method: string,
  operation: "insert" | "update",
) {
  const body = androidMethod(source, method);
  const values = /ContentValues\(\)\.apply \{([\s\S]*?)\n\s*\}/.exec(body)?.[1];
  if (!values) throw new Error(`ContentValues in ${method} not found`);
  const columns = [...values.matchAll(/put(?:Null)?\(\s*"(\w+)"/g)].map(
    (match) => match[1],
  );
  const table = /db\.(?:insertOrThrow|update)\(\s*"(\w+)"/.exec(body)?.[1];
  if (!table || columns.length === 0)
    throw new Error(`Write in ${method} not found`);
  const sql =
    operation === "insert"
      ? `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`
      : `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE ${nativeSql(body, /^id = \(SELECT/)}`;
  return { sql, columns };
}

function bindColumns(columns: string[], values: Record<string, SQLInputValue>) {
  return columns.map((column) => {
    if (!Object.hasOwn(values, column))
      throw new Error(`Missing fixture value for ${column}`);
    return values[column];
  });
}

const nativeTables = [
  "activities",
  "activity_kinds",
  "activity_logs",
  "auth_state",
];
let db: ReturnType<typeof createSqliteTestDb> | undefined;
afterEach(() => db?.sqlite.close());

describe("v13 database compatibility with existing v12 widgets", () => {
  it.each([
    { platform: "iOS", writer: "insertActivityLog", kindId: null },
    { platform: "iOS", writer: "insertActivityLog", kindId: "kind-a" },
    { platform: "Android", writer: "insertActivityLog", kindId: null },
    { platform: "Android", writer: "insertActivityLog", kindId: "kind-a" },
    { platform: "Android", writer: "insertLog", kindId: null },
    { platform: "Android", writer: "insertLog", kindId: "kind-a" },
  ])("preserves $platform $writer queries and writes (kind=$kindId)", async ({
    platform,
    writer,
    kindId,
  }) => {
    expect(MINIMUM_WIDGET_SCHEMA_VERSION).toBe(12);
    expect(SCHEMA_VERSION).toBe(13);
    expect(WIDGET_SCHEMA_COMPATIBILITY_REVIEWED_VERSION).toBe(13);
    db = createSqliteTestDb(12);
    const sqlite = db.sqlite;
    sqlite.exec(`
      INSERT INTO auth_state (id, user_id, plan) VALUES ('current', 'user-a', 'premium');
      INSERT INTO activities (id, user_id, name, recording_mode, created_at, updated_at)
      VALUES ('activity-a', 'user-a', 'Focus', 'timer', '2026-09-01', '2026-09-01'),
             ('foreign-activity', 'user-b', 'Other user', 'timer', '2026-09-01', '2026-09-01');
      INSERT INTO activity_kinds (id, activity_id, name, created_at, updated_at)
      VALUES ('kind-a', 'activity-a', 'Deep', '2026-09-01', '2026-09-01'),
             ('foreign-kind', 'foreign-activity', 'Other', '2026-09-01', '2026-09-01');
    `);

    const activities =
      platform === "iOS"
        ? readNative(swiftDirectory, "WidgetActivityQueries.swift")
        : readNative(kotlinDirectory, "WidgetDbActivityQueries.kt");
    const logs =
      platform === "iOS"
        ? readNative(swiftDirectory, "WidgetDbQueries.swift")
        : readNative(kotlinDirectory, "WidgetLogHelper.kt");
    const insert =
      platform === "iOS"
        ? {
            sql: nativeSql(
              readNative(swiftDirectory, "WidgetActivityLogWriter.swift"),
              /^INSERT INTO activity_logs /,
            ),
            columns: [
              "id",
              "activity_id",
              "activity_kind_id",
              "quantity",
              "memo",
              "date",
              "sync_status",
              "created_at",
              "updated_at",
            ],
          }
        : androidWrite(
            writer === "insertActivityLog"
              ? readNative(kotlinDirectory, "WidgetDbLogWriter.kt")
              : logs,
            writer,
            "insert",
          );
    const softDelete =
      platform === "iOS"
        ? {
            sql: nativeSql(logs, /^UPDATE activity_logs /),
            columns: ["deleted_at", "updated_at"],
          }
        : androidWrite(logs, "softDeleteTodayLog", "update");
    const insertValues: Record<string, SQLInputValue> = {
      id: "old-log",
      activity_id: "activity-a",
      activity_kind_id: kindId,
      quantity: 2,
      memo: "Before migration",
      date: "2026-09-12",
      time: null,
      task_id: null,
      sync_status: "pending",
      deleted_at: null,
      created_at: "2026-09-12T09:00:00.000Z",
      updated_at: "2026-09-12T09:00:00.000Z",
    };
    sqlite
      .prepare(insert.sql)
      .run(...bindColumns(insert.columns, insertValues));
    const widgetSchemaBefore = nativeTables.map((table) =>
      sqlite.prepare(`PRAGMA table_info(${table})`).all(),
    );

    await migrateDb(db);

    expect(sqlite.prepare("PRAGMA user_version").get()).toEqual({
      user_version: 13,
    });
    expect(
      nativeTables.map((table) =>
        sqlite.prepare(`PRAGMA table_info(${table})`).all(),
      ),
    ).toEqual(widgetSchemaBefore);
    expect(
      sqlite
        .prepare(nativeSql(activities, /^SELECT plan FROM auth_state/))
        .get(),
    ).toEqual({ plan: "premium" });
    expect(
      sqlite
        .prepare(nativeSql(activities, /WHERE recording_mode = \?/))
        .all("timer"),
    ).toEqual([expect.objectContaining({ id: "activity-a", name: "Focus" })]);
    const byId = sqlite.prepare(
      nativeSql(activities, /WHERE id = \? AND deleted_at/),
    );
    expect(byId.get("activity-a")).toMatchObject({ id: "activity-a" });
    expect(byId.get("foreign-activity")).toBeUndefined();
    expect(
      sqlite
        .prepare(
          nativeSql(activities, /^SELECT id, name, color FROM activity_kinds/),
        )
        .all("activity-a"),
    ).toEqual([{ id: "kind-a", name: "Deep", color: null }]);
    const ownedKind = sqlite.prepare(
      nativeSql(activities, /^SELECT COUNT\(\*\) FROM activity_kinds/),
    );
    expect(Object.values(ownedKind.get("kind-a", "activity-a") ?? {})).toEqual([
      1,
    ]);
    expect(
      Object.values(ownedKind.get("foreign-kind", "activity-a") ?? {}),
    ).toEqual([0]);

    const total = sqlite.prepare(
      nativeSql(logs, /^SELECT COALESCE\(SUM\(quantity\)/),
    );
    expect(Object.values(total.get("activity-a", "2026-09-12") ?? {})).toEqual([
      2,
    ]);
    sqlite.prepare(insert.sql).run(
      ...bindColumns(insert.columns, {
        ...insertValues,
        id: "new-log",
        quantity: 3,
        memo: "After migration",
        created_at: "2026-09-12T10:00:00.000Z",
        updated_at: "2026-09-12T10:00:00.000Z",
      }),
    );
    expect(Object.values(total.get("activity-a", "2026-09-12") ?? {})).toEqual([
      5,
    ]);
    const count = sqlite.prepare(
      nativeSql(logs, /^SELECT COUNT\(\*\) FROM activity_logs/),
    );
    const conditions = ["activity-a", kindId, kindId, "2026-09-12"];
    expect(Object.values(count.get(...conditions) ?? {})).toEqual([2]);
    const removed = sqlite.prepare(softDelete.sql).run(
      ...bindColumns(softDelete.columns, {
        deleted_at: "2026-09-12T11:00:00.000Z",
        updated_at: "2026-09-12T11:00:00.000Z",
        sync_status: "pending",
      }),
      ...conditions,
    );
    expect(removed.changes).toBe(1);
    expect(Object.values(count.get(...conditions) ?? {})).toEqual([1]);
    expect(Object.values(total.get("activity-a", "2026-09-12") ?? {})).toEqual([
      2,
    ]);
    expect(
      sqlite
        .prepare("SELECT id, deleted_at FROM activity_logs ORDER BY id")
        .all(),
    ).toEqual([
      { id: "new-log", deleted_at: "2026-09-12T11:00:00.000Z" },
      { id: "old-log", deleted_at: null },
    ]);
  });
});
