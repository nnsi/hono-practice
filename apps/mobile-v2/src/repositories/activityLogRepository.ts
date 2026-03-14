import type { SyncStatus } from "@packages/domain";
import type { ActivityLogRecord } from "@packages/domain/activityLog/activityLogRecord";
import type { ActivityLogRepository } from "@packages/domain/activityLog/activityLogRepository";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import {
  type ActivityLogDbAdapter,
  newActivityLogRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

// --- Row mapping helpers (snake_case SQL -> camelCase TS) ---

type SqlRow = Record<string, unknown>;
type LocalActivityLog = Omit<ActivityLogRecord, "userId">;

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

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

export function mapActivityLogRow(row: SqlRow): Syncable<LocalActivityLog> {
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
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const columnMap: Record<string, string> = {
  quantity: "quantity",
  memo: "memo",
  activityKindId: "activity_kind_id",
  date: "date",
  time: "time",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};

const adapter: ActivityLogDbAdapter = {
  async insert(log) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO activity_logs (id, activity_id, activity_kind_id, quantity, memo, date, time, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.activityId,
        log.activityKindId,
        log.quantity,
        log.memo,
        log.date,
        log.time,
        log._syncStatus,
        log.deletedAt,
        log.createdAt,
        log.updatedAt,
      ],
    );
    dbEvents.emit("activity_logs");
  },

  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>("SELECT * FROM activity_logs");
    return rows.map(mapActivityLogRow).filter(filter);
  },

  async getByDate(date) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_logs WHERE date = ? AND deleted_at IS NULL",
      [date],
    );
    return rows.map(mapActivityLogRow);
  },

  async getByDateRange(startDate, endDate) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM activity_logs WHERE date >= ? AND date <= ? AND deleted_at IS NULL ORDER BY date",
      [startDate, endDate],
    );
    return rows.map(mapActivityLogRow);
  },

  async update(id, changes) {
    const db = await getDatabase();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(changes)) {
      const col = columnMap[key];
      if (!col) continue;
      setClauses.push(`${col} = ?`);
      values.push(value as string | number | null);
    }

    if (setClauses.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE activity_logs SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );
    dbEvents.emit("activity_logs");
  },

  async getByIds(ids) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM activity_logs WHERE id IN (${placeholders})`,
      ids,
    );
    return rows.map(mapActivityLogRow);
  },

  async updateSyncStatus(ids, status) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE activity_logs SET sync_status = ? WHERE id IN (${placeholders})`,
      [status, ...ids],
    );
    dbEvents.emit("activity_logs");
  },

  async bulkUpsertSynced(logs) {
    if (logs.length === 0) return;
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const log of logs) {
        await db.runAsync(
          `INSERT OR REPLACE INTO activity_logs (id, activity_id, activity_kind_id, quantity, memo, date, time, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.activityId,
            log.activityKindId,
            log.quantity,
            log.memo,
            log.date,
            log.time,
            log._syncStatus,
            log.deletedAt,
            log.createdAt,
            log.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("activity_logs");
  },
};

export const activityLogRepository = newActivityLogRepository(
  adapter,
) satisfies ActivityLogRepository;
