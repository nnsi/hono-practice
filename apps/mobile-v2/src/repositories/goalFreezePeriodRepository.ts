import type { SyncStatus } from "@packages/domain";
import type { GoalFreezePeriodRecord } from "@packages/domain/goal/goalFreezePeriod";
import { v7 as uuidv7 } from "uuid";

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

// --- Repository ---

type CreateFreezePeriodInput = {
  goalId: string;
  startDate: string;
  endDate?: string | null;
};

type UpdateFreezePeriodInput = Partial<
  Pick<GoalFreezePeriodRecord, "startDate" | "endDate">
>;

export const goalFreezePeriodRepository = {
  async createGoalFreezePeriod(input: CreateFreezePeriodInput) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = uuidv7();

    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id) {
      throw new Error("Cannot create freeze period: userId is not set");
    }

    await db.runAsync(
      `INSERT INTO goal_freeze_periods (id, goal_id, user_id, start_date, end_date, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
      [
        id,
        input.goalId,
        auth.user_id,
        input.startDate,
        input.endDate ?? null,
        now,
        now,
      ],
    );

    dbEvents.emit("goal_freeze_periods");

    return {
      id,
      goalId: input.goalId,
      userId: auth.user_id,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending" as const,
    };
  },

  async getFreezePeriodsByGoalId(
    goalId: string,
  ): Promise<FreezePeriodWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goal_freeze_periods WHERE goal_id = ? AND deleted_at IS NULL",
      [goalId],
    );
    return rows.map(mapFreezePeriodRow);
  },

  async updateGoalFreezePeriod(
    id: string,
    changes: UpdateFreezePeriodInput,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ["updated_at = ?", "sync_status = 'pending'"];
    const values: (string | null)[] = [now];

    if (changes.startDate !== undefined) {
      setClauses.push("start_date = ?");
      values.push(changes.startDate);
    }
    if (changes.endDate !== undefined) {
      setClauses.push("end_date = ?");
      values.push(changes.endDate);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE goal_freeze_periods SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    dbEvents.emit("goal_freeze_periods");
  },

  async softDeleteGoalFreezePeriod(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE goal_freeze_periods SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );

    dbEvents.emit("goal_freeze_periods");
  },

  // --- Sync helpers ---

  async getPendingSyncFreezePeriods(): Promise<FreezePeriodWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goal_freeze_periods WHERE sync_status = 'pending'",
    );
    return rows.map(mapFreezePeriodRow);
  },

  async markFreezePeriodsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE goal_freeze_periods SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("goal_freeze_periods");
  },

  async markFreezePeriodsFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE goal_freeze_periods SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("goal_freeze_periods");
  },

  // --- Server upsert ---

  async upsertFreezePeriodsFromServer(
    periods: GoalFreezePeriodRecord[],
  ): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const fp of periods) {
        await db.runAsync(
          `INSERT INTO goal_freeze_periods (id, goal_id, user_id, start_date, end_date, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'synced', ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             goal_id = excluded.goal_id,
             user_id = excluded.user_id,
             start_date = excluded.start_date,
             end_date = excluded.end_date,
             sync_status = 'synced',
             deleted_at = excluded.deleted_at,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at
           WHERE sync_status <> 'pending'
             AND updated_at <= excluded.updated_at`,
          [
            fp.id,
            fp.goalId,
            fp.userId,
            fp.startDate,
            fp.endDate,
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
