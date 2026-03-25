import type * as SQLite from "expo-sqlite";

import {
  MIGRATION_V1,
  MIGRATION_V10,
  MIGRATION_V2,
  MIGRATION_V3,
  MIGRATION_V4,
  MIGRATION_V5,
  MIGRATION_V6,
  MIGRATION_V7,
  MIGRATION_V8,
  MIGRATION_V9,
} from "./migrationSql";

const SCHEMA_VERSION = 10;

export async function migrateDb(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(MIGRATION_V1);
  }
  if (currentVersion < 2) {
    await db.execAsync(MIGRATION_V2);
  }
  if (currentVersion < 3) {
    await db.execAsync(MIGRATION_V3);
  }
  if (currentVersion < 4) {
    await db.execAsync(MIGRATION_V4);
  }
  if (currentVersion < 5) {
    await db.execAsync(MIGRATION_V5);
  }
  if (currentVersion < 6) {
    await db.execAsync(MIGRATION_V6);
  }
  if (currentVersion < 7) {
    await db.execAsync(MIGRATION_V7);
  }
  if (currentVersion < 8) {
    await db.execAsync(MIGRATION_V8);
  }
  if (currentVersion < 9) {
    await db.execAsync(MIGRATION_V9);
  }
  if (currentVersion < 10) {
    await db.execAsync(MIGRATION_V10);
  }
  if (currentVersion < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}
