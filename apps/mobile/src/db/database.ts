import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import { getAppGroupDirectory } from "./appGroupDirectory";
import { migrateDb } from "./migrations";

const DB_NAME = "actiko.db";

function migrateDbToAppGroup(appGroupDir: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File, Directory, Paths } =
      require("expo-file-system") as typeof import("expo-file-system");
    const oldDir = new Directory(Paths.document, "SQLite");
    const newDir = new Directory(`file://${appGroupDir}`);

    const newDbFile = new File(newDir, DB_NAME);
    if (newDbFile.exists) return;

    const oldDbFile = new File(oldDir, DB_NAME);
    if (!oldDbFile.exists) return;

    if (!newDir.exists) {
      newDir.create({ intermediates: true });
    }

    for (const ext of ["", "-wal", "-shm"]) {
      const src = new File(oldDir, `${DB_NAME}${ext}`);
      if (src.exists) {
        src.copy(newDir);
      }
    }
  } catch (e) {
    console.warn("[DB Migration] Failed to migrate DB to App Group:", e);
  }
}

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const appGroupDir = getAppGroupDirectory();

      if (Platform.OS === "ios" && appGroupDir) {
        migrateDbToAppGroup(appGroupDir);
      }

      const db = await SQLite.openDatabaseAsync(DB_NAME, {}, appGroupDir);
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await migrateDb(db);
      return db;
    })();
  }
  return _dbPromise;
}
