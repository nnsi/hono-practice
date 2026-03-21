import * as SQLite from "expo-sqlite";

import { migrateDb } from "./migrations";

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("actiko.db");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await migrateDb(db);
      return db;
    })();
  }
  return _dbPromise;
}
