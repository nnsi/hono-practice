import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { SyncStatus } from "@packages/domain/sync/syncableRecord";
import {
  type NoteDbAdapter,
  newNoteRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

// --- Row mapping helpers (snake_case SQL -> camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

type NoteWithSync = NoteRecord & { _syncStatus: SyncStatus };

export function mapNoteRow(row: SqlRow): NoteWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: strOrNull(row.activity_id),
    title: str(row.title),
    content: str(row.content),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const adapter: NoteDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id)
      throw new Error("Cannot create note: userId is not set");
    return auth.user_id;
  },
  async insert(note) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO note (id, user_id, activity_id, title, content, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.userId,
        note.activityId,
        note.title,
        note.content,
        note.createdAt,
        note.updatedAt,
        note.deletedAt,
        note._syncStatus,
      ],
    );
    dbEvents.emit("notes");
  },
  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM note WHERE deleted_at IS NULL AND sync_status != 'deleted'",
    );
    return rows.map(mapNoteRow).filter(filter);
  },
  async getById(id) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SqlRow>(
      "SELECT * FROM note WHERE id = ?",
      [id],
    );
    return row ? mapNoteRow(row) : undefined;
  },
  async update(id, changes) {
    const db = await getDatabase();
    const columnMap: Record<string, string> = {
      title: "title",
      content: "content",
      activityId: "activity_id",
      deletedAt: "deleted_at",
      updatedAt: "updated_at",
      _syncStatus: "sync_status",
    };
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, val] of Object.entries(changes)) {
      const col = columnMap[key];
      if (col) {
        sets.push(`${col} = ?`);
        vals.push(val as string | number | null);
      }
    }
    vals.push(id);
    await db.runAsync(`UPDATE note SET ${sets.join(", ")} WHERE id = ?`, vals);
    dbEvents.emit("notes");
  },
  async getByIds(ids) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM note WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapNoteRow);
  },
  async updateSyncStatus(ids, status) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(`UPDATE note SET sync_status = ? WHERE id IN (${ph})`, [
      status,
      ...ids,
    ]);
    dbEvents.emit("notes");
  },
  async bulkUpsertSynced(notes) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const n of notes) {
        await db.runAsync(
          `INSERT OR REPLACE INTO note (id, user_id, activity_id, title, content, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            n.id,
            n.userId,
            n.activityId,
            n.title,
            n.content,
            n._syncStatus,
            n.deletedAt,
            n.createdAt,
            n.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("notes");
  },
};

export const noteRepository = newNoteRepository(adapter);
