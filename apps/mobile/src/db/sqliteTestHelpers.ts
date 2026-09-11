import { DatabaseSync } from "node:sqlite";

import { vi } from "vitest";

import * as migrations from "./migrationSql";

export function createSqliteTestDb(version = 13) {
  const sqlite = new DatabaseSync(":memory:");
  const sqlVersions = [
    migrations.MIGRATION_V1,
    migrations.MIGRATION_V2,
    migrations.MIGRATION_V3,
    migrations.MIGRATION_V4,
    migrations.MIGRATION_V5,
    migrations.MIGRATION_V6,
    migrations.MIGRATION_V7,
    migrations.MIGRATION_V8,
    migrations.MIGRATION_V9,
    migrations.MIGRATION_V10,
    migrations.MIGRATION_V11,
    migrations.MIGRATION_V12,
    migrations.MIGRATION_V13,
  ];
  for (const sql of sqlVersions.slice(0, version)) sqlite.exec(sql);
  sqlite.exec(`PRAGMA user_version = ${version}`);
  return {
    sqlite,
    execAsync: vi
      .fn()
      .mockImplementation(async (sql: string) => sqlite.exec(sql)),
    getFirstAsync: vi
      .fn()
      .mockImplementation(
        async (sql: string, values: (string | number | null)[] = []) =>
          sqlite.prepare(sql).get(...values) ?? null,
      ),
    getAllAsync: vi
      .fn()
      .mockImplementation(
        async (sql: string, values: (string | number | null)[] = []) =>
          sqlite.prepare(sql).all(...values),
      ),
    runAsync: vi
      .fn()
      .mockImplementation(
        async (sql: string, values: (string | number | null)[] = []) =>
          sqlite.prepare(sql).run(...values),
      ),
  };
}
