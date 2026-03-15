import type { SyncStatus } from "@packages/domain";
import { parseDayTargets } from "@packages/domain/goal/dayTargets";
import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { GoalRepository } from "@packages/domain/goal/goalRepository";
import {
  type GoalDbAdapter,
  newGoalRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";

// --- Row mapping helpers (snake_case SQL → camelCase TS) ---

type SqlRow = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: unknown, defaultValue: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? defaultValue : n;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Goals in the local DB do NOT store currentBalance/totalTarget/totalActual
// (they are computed from logs). We include them as 0 in the mapped type
// for compatibility with GoalRecord.
type GoalWithSync = GoalRecord & { _syncStatus: SyncStatus };

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

export function mapGoalRow(row: SqlRow): GoalWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: str(row.activity_id),
    dailyTargetQuantity: num(row.daily_target_quantity, 0),
    startDate: str(row.start_date),
    endDate: strOrNull(row.end_date),
    isActive: row.is_active === 1,
    description: str(row.description),
    debtCap: numOrNull(row.debt_cap),
    dayTargets: parseDayTargets(row.day_targets),
    currentBalance: 0,
    totalTarget: 0,
    totalActual: 0,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const adapter: GoalDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id)
      throw new Error("Cannot create goal: userId is not set");
    return auth.user_id;
  },
  async insert(goal) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO goals (id, user_id, activity_id, daily_target_quantity, day_targets, start_date, end_date, is_active, description, debt_cap, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.id,
        goal.userId,
        goal.activityId,
        goal.dailyTargetQuantity,
        goal.dayTargets ? JSON.stringify(goal.dayTargets) : null,
        goal.startDate,
        goal.endDate,
        goal.isActive ? 1 : 0,
        goal.description,
        goal.debtCap,
        goal._syncStatus,
        goal.deletedAt,
        goal.createdAt,
        goal.updatedAt,
      ],
    );
    dbEvents.emit("goals");
  },
  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>("SELECT * FROM goals");
    return rows.map(mapGoalRow).filter(filter);
  },
  async update(id, changes) {
    const db = await getDatabase();
    const columnMap: Record<string, string> = {
      dailyTargetQuantity: "daily_target_quantity",
      startDate: "start_date",
      endDate: "end_date",
      isActive: "is_active",
      description: "description",
      debtCap: "debt_cap",
      dayTargets: "day_targets",
      updatedAt: "updated_at",
      _syncStatus: "sync_status",
      deletedAt: "deleted_at",
    };
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, val] of Object.entries(changes)) {
      const col = columnMap[key];
      if (!col) continue;
      if (key === "isActive") {
        sets.push(`${col} = ?`);
        vals.push(val ? 1 : 0);
      } else if (key === "dayTargets") {
        sets.push(`${col} = ?`);
        vals.push(val ? JSON.stringify(val) : null);
      } else {
        sets.push(`${col} = ?`);
        vals.push(val as string | number | null);
      }
    }
    vals.push(id);
    await db.runAsync(`UPDATE goals SET ${sets.join(", ")} WHERE id = ?`, vals);
    dbEvents.emit("goals");
  },
  async getByIds(ids) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM goals WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapGoalRow);
  },
  async updateSyncStatus(ids, status) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(`UPDATE goals SET sync_status = ? WHERE id IN (${ph})`, [
      status,
      ...ids,
    ]);
    dbEvents.emit("goals");
  },
  async bulkUpsertSynced(goals) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const g of goals) {
        await db.runAsync(
          `INSERT OR REPLACE INTO goals (id, user_id, activity_id, daily_target_quantity, day_targets, start_date, end_date, is_active, description, debt_cap, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            g.id,
            g.userId,
            g.activityId,
            g.dailyTargetQuantity,
            g.dayTargets ? JSON.stringify(g.dayTargets) : null,
            g.startDate,
            g.endDate,
            g.isActive ? 1 : 0,
            g.description,
            g.debtCap,
            g._syncStatus,
            g.deletedAt,
            g.createdAt,
            g.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("goals");
  },
};

export const goalRepository = newGoalRepository(
  adapter,
) satisfies GoalRepository;
