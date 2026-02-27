import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { v7 as uuidv7 } from "uuid";

// --- Row mapping helpers (snake_case SQL → camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Local DB omits userId (it's implicit from auth_state)
type LocalActivityLog = Omit<ActivityLogRecord, "userId">;
type ActivityLogWithSync = LocalActivityLog & { _syncStatus: string };

function mapActivityLogRow(row: SqlRow): ActivityLogWithSync {
  return {
    id: str(row.id),
    activityId: str(row.activity_id),
    activityKindId: strOrNull(row.activity_kind_id),
    quantity: numOrNull(row.quantity),
    memo: str(row.memo),
    date: str(row.date),
    time: strOrNull(row.time),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: str(row.sync_status),
  };
}

// --- Repository ---

type CreateActivityLogInput = {
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

export const activityLogRepository = {
  async createActivityLog(input: CreateActivityLogInput) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = uuidv7();

    await db.runAsync(
      `INSERT INTO activity_logs (id, activity_id, activity_kind_id, quantity, memo, date, time, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      [
        id,
        input.activityId,
        input.activityKindId,
        input.quantity,
        input.memo,
        input.date,
        input.time,
        now,
        now,
      ],
    );

    dbEvents.emit("activity_logs");

    return {
      id,
      activityId: input.activityId,
      activityKindId: input.activityKindId,
      quantity: input.quantity,
      memo: input.memo,
      date: input.date,
      time: input.time,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
  },

  async getActivityLogsBetween(startDate: string, endDate: string): Promise<ActivityLogWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_logs WHERE date >= ? AND date <= ? AND deleted_at IS NULL ORDER BY date",
      [startDate, endDate],
    );
    return rows.map(mapActivityLogRow);
  },

  async getActivityLogsByDate(date: string): Promise<ActivityLogWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_logs WHERE date = ? AND deleted_at IS NULL",
      [date],
    );
    return rows.map(mapActivityLogRow);
  },

  async updateActivityLog(
    id: string,
    changes: Partial<
      Pick<
        LocalActivityLog,
        "quantity" | "memo" | "activityKindId" | "date" | "time"
      >
    >,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ["updated_at = ?", "sync_status = 'pending'"];
    const values: (string | number | null)[] = [now];

    if (changes.quantity !== undefined) {
      setClauses.push("quantity = ?");
      values.push(changes.quantity);
    }
    if (changes.memo !== undefined) {
      setClauses.push("memo = ?");
      values.push(changes.memo);
    }
    if (changes.activityKindId !== undefined) {
      setClauses.push("activity_kind_id = ?");
      values.push(changes.activityKindId);
    }
    if (changes.date !== undefined) {
      setClauses.push("date = ?");
      values.push(changes.date);
    }
    if (changes.time !== undefined) {
      setClauses.push("time = ?");
      values.push(changes.time);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE activity_logs SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    dbEvents.emit("activity_logs");
  },

  async softDeleteActivityLog(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE activity_logs SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );

    dbEvents.emit("activity_logs");
  },

  // --- Sync helpers ---

  async getPendingSyncActivityLogs(): Promise<ActivityLogWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_logs WHERE sync_status = 'pending'",
    );
    return rows.map(mapActivityLogRow);
  },

  async markActivityLogsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_logs SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activity_logs");
  },

  async markActivityLogsFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_logs SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("activity_logs");
  },

  // --- Server upsert ---

  async upsertActivityLogsFromServer(
    logs: Omit<LocalActivityLog, never>[],
  ): Promise<void> {
    const db = await getDatabase();
    for (const log of logs) {
      await db.runAsync(
        `INSERT OR REPLACE INTO activity_logs (id, activity_id, activity_kind_id, quantity, memo, date, time, sync_status, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
        [
          log.id,
          log.activityId,
          log.activityKindId,
          log.quantity,
          log.memo,
          log.date,
          log.time,
          log.deletedAt,
          log.createdAt,
          log.updatedAt,
        ],
      );
    }
    dbEvents.emit("activity_logs");
  },
};
