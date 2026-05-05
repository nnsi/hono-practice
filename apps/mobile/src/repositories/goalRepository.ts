import type { GoalRepository } from "@packages/domain/goal/goalRepository";
import {
  type GoalDbAdapter,
  newGoalRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { toSqlBindable } from "./sqlRowHelpers";
import { type SqlRow, goalColumnMap, mapGoalRow } from "./goalRowMappers";

export { mapGoalRow } from "./goalRowMappers";

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
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const [key, val] of Object.entries(changes)) {
      const col = goalColumnMap[key];
      if (!col) continue;
      sets.push(`${col} = ?`);
      if (key === "dayTargets") {
        vals.push(val ? JSON.stringify(val) : null);
      } else {
        vals.push(toSqlBindable(val));
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
