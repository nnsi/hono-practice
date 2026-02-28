import type { GoalRecord } from "@packages/domain/goal/goalRecord";
import type { GoalRepository } from "@packages/domain/goal/goalRepository";
import type { SyncStatus } from "@packages/domain";
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

function num(v: unknown, defaultValue: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? defaultValue : n;
}

// Goals in the local DB do NOT store currentBalance/totalTarget/totalActual
// (they are computed from logs). We include them as 0 in the mapped type
// for compatibility with GoalRecord.
type GoalWithSync = GoalRecord & { _syncStatus: SyncStatus };

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

function mapGoalRow(row: SqlRow): GoalWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: str(row.activity_id),
    dailyTargetQuantity: num(row.daily_target_quantity, 0),
    startDate: str(row.start_date),
    endDate: strOrNull(row.end_date),
    isActive: row.is_active === 1,
    description: str(row.description),
    currentBalance: 0,
    totalTarget: 0,
    totalActual: 0,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Repository ---

type CreateGoalInput = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string | null;
  description?: string;
};

type UpdateGoalInput = Partial<
  Pick<
    GoalRecord,
    "dailyTargetQuantity" | "startDate" | "endDate" | "isActive" | "description"
  >
>;

export const goalRepository = {
  async createGoal(input: CreateGoalInput) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = uuidv7();

    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );

    await db.runAsync(
      `INSERT INTO goals (id, user_id, activity_id, daily_target_quantity, start_date, end_date, is_active, description, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'pending', NULL, ?, ?)`,
      [
        id,
        auth?.user_id ?? "",
        input.activityId,
        input.dailyTargetQuantity,
        input.startDate,
        input.endDate ?? null,
        input.description ?? "",
        now,
        now,
      ],
    );

    dbEvents.emit("goals");

    return {
      id,
      userId: auth?.user_id ?? "",
      activityId: input.activityId,
      dailyTargetQuantity: input.dailyTargetQuantity,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      isActive: true,
      description: input.description ?? "",
      currentBalance: 0,
      totalTarget: 0,
      totalActual: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending" as const,
    };
  },

  async getAllGoals(): Promise<GoalWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY start_date DESC",
    );
    return rows.map(mapGoalRow);
  },

  async updateGoal(id: string, changes: UpdateGoalInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ["updated_at = ?", "sync_status = 'pending'"];
    const values: (string | number | null)[] = [now];

    if (changes.dailyTargetQuantity !== undefined) {
      setClauses.push("daily_target_quantity = ?");
      values.push(changes.dailyTargetQuantity);
    }
    if (changes.startDate !== undefined) {
      setClauses.push("start_date = ?");
      values.push(changes.startDate);
    }
    if (changes.endDate !== undefined) {
      setClauses.push("end_date = ?");
      values.push(changes.endDate);
    }
    if (changes.isActive !== undefined) {
      setClauses.push("is_active = ?");
      values.push(changes.isActive ? 1 : 0);
    }
    if (changes.description !== undefined) {
      setClauses.push("description = ?");
      values.push(changes.description);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE goals SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    dbEvents.emit("goals");
  },

  async softDeleteGoal(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE goals SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );

    dbEvents.emit("goals");
  },

  // --- Sync helpers ---

  async getPendingSyncGoals(): Promise<GoalWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM goals WHERE sync_status = 'pending'",
    );
    return rows.map(mapGoalRow);
  },

  async markGoalsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE goals SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("goals");
  },

  async markGoalsFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE goals SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("goals");
  },

  // --- Server upsert ---

  async upsertGoalsFromServer(goals: GoalRecord[]): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const g of goals) {
        await db.runAsync(
          `INSERT OR REPLACE INTO goals (id, user_id, activity_id, daily_target_quantity, start_date, end_date, is_active, description, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
          [
            g.id,
            g.userId,
            g.activityId,
            g.dailyTargetQuantity,
            g.startDate,
            g.endDate,
            g.isActive ? 1 : 0,
            g.description,
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
} satisfies GoalRepository;
