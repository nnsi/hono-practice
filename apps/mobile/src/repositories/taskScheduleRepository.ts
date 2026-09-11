import {
  type TaskScheduleDbAdapter,
  type TaskScheduleRepository,
  newTaskScheduleRepository,
} from "@packages/frontend-shared/repositories";

import { getDatabase } from "../db/database";
import { dbEvents } from "../db/dbEvents";
import { toSqlBindable } from "./sqlRowHelpers";
import {
  mapTaskScheduleRow,
  taskScheduleColumnMap,
  taskScheduleColumns,
  taskScheduleValues,
} from "./taskScheduleRowMapper";

type SqlRow = Record<string, unknown>;
type TaskScheduleRow = NonNullable<ReturnType<typeof mapTaskScheduleRow>>;

/** 壊れた行（mapper が null を返す）は除外する */
const mapRows = (rows: SqlRow[]): TaskScheduleRow[] =>
  rows
    .map(mapTaskScheduleRow)
    .filter((row): row is TaskScheduleRow => row !== null);
const placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";

const adapter: TaskScheduleDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id)
      throw new Error("Cannot create task schedule: userId is not set");
    return auth.user_id;
  },
  async insert(schedule) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO task_schedules (${taskScheduleColumns}) VALUES (${placeholders})`,
      taskScheduleValues(schedule),
    );
    dbEvents.emit("task_schedules");
  },
  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>("SELECT * FROM task_schedules");
    return mapRows(rows).filter(filter);
  },
  async update(id, changes) {
    const db = await getDatabase();
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(changes)) {
      const column = taskScheduleColumnMap[key];
      if (!column) continue;
      sets.push(`${column} = ?`);
      values.push(
        key === "weekdays" && value != null
          ? JSON.stringify(value)
          : toSqlBindable(value),
      );
    }
    if (sets.length === 0) return;
    await db.runAsync(
      `UPDATE task_schedules SET ${sets.join(", ")} WHERE id = ?`,
      [...values, id],
    );
    dbEvents.emit("task_schedules");
  },
  async getByIds(ids) {
    if (ids.length === 0) return [];
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM task_schedules WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    return mapRows(rows);
  },
  async updateSyncStatus(ids, status) {
    if (ids.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE task_schedules SET sync_status = ? WHERE id IN (${ids.map(() => "?").join(",")})`,
      [status, ...ids],
    );
    dbEvents.emit("task_schedules");
  },
  async bulkUpsertSynced(schedules) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const schedule of schedules) {
        await db.runAsync(
          `INSERT OR REPLACE INTO task_schedules (${taskScheduleColumns}) VALUES (${placeholders})`,
          taskScheduleValues(schedule),
        );
      }
      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
    dbEvents.emit("task_schedules");
  },
};

export const taskScheduleRepository = newTaskScheduleRepository(
  adapter,
) satisfies TaskScheduleRepository;
