import type { SyncStatus } from "@packages/domain";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import {
  type GoalFreezePeriodDbAdapter,
  newGoalFreezePeriodRepository,
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

type FreezePeriodWithSync = GoalFreezePeriodRecord & {
  _syncStatus: SyncStatus;
};

export function mapFreezePeriodRow(row: SqlRow): FreezePeriodWithSync {
  return {
    id: str(row.id),
    goalId: str(row.goal_id),
    userId: str(row.user_id),
    startDate: str(row.start_date),
    endDate: strOrNull(row.end_date),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const adapter: GoalFreezePeriodDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id)
      throw new Error("Cannot create freeze period: userId is not set");
    return auth.user_id;
  },
  async insert(period) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO goal_freeze_periods (id, goal_id, user_id, start_date, end_date, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        period.id,
        period.goalId,
        period.userId,
        period.startDate,
        period.endDate,
        period._syncStatus,
        period.deletedAt,
        period.createdAt,
        period.updatedAt,
      ],
    );
    dbEvents.emit("goal_freeze_periods");
  },
  async getByGoalId(goalId) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goal_freeze_periods WHERE goal_id = ? AND deleted_at IS NULL",
      [goalId],
    );
    return rows.map(mapFreezePeriodRow);
  },
  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goal_freeze_periods",
    );
    return rows.map(mapFreezePeriodRow).filter(filter);
  },
  async update(id, changes) {
    const db = await getDatabase();
    const columnMap: Record<string, string> = {
      startDate: "start_date",
      endDate: "end_date",
      updatedAt: "updated_at",
      _syncStatus: "sync_status",
      deletedAt: "deleted_at",
    };
    const sets: string[] = [];
    const vals: (string | null)[] = [];
    for (const [key, val] of Object.entries(changes)) {
      const col = columnMap[key];
      if (col) {
        sets.push(`${col} = ?`);
        vals.push(val as string | null);
      }
    }
    vals.push(id);
    await db.runAsync(
      `UPDATE goal_freeze_periods SET ${sets.join(", ")} WHERE id = ?`,
      vals,
    );
    dbEvents.emit("goal_freeze_periods");
  },
  async getByIds(ids) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM goal_freeze_periods WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapFreezePeriodRow);
  },
  async updateSyncStatus(ids, status) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE goal_freeze_periods SET sync_status = ? WHERE id IN (${ph})`,
      [status, ...ids],
    );
    dbEvents.emit("goal_freeze_periods");
  },
  async bulkUpsertSynced(periods) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const fp of periods) {
        await db.runAsync(
          `INSERT OR REPLACE INTO goal_freeze_periods (id, goal_id, user_id, start_date, end_date, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fp.id,
            fp.goalId,
            fp.userId,
            fp.startDate,
            fp.endDate,
            fp._syncStatus,
            fp.deletedAt,
            fp.createdAt,
            fp.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("goal_freeze_periods");
  },
};

export const goalFreezePeriodRepository =
  newGoalFreezePeriodRepository(adapter);
