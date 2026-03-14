import type { SyncStatus } from "@packages/domain/sync/syncableRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import type { TaskRepository } from "@packages/domain/task/taskRepository";
import {
  type TaskDbAdapter,
  newTaskRepository,
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

type TaskWithSync = TaskRecord & { _syncStatus: SyncStatus };

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed") return v;
  return "synced";
}

export function mapTaskRow(row: SqlRow): TaskWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    activityId: strOrNull(row.activity_id),
    title: str(row.title),
    startDate: strOrNull(row.start_date),
    dueDate: strOrNull(row.due_date),
    doneDate: strOrNull(row.done_date),
    memo: str(row.memo),
    archivedAt: strOrNull(row.archived_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

// --- Adapter ---

const adapter: TaskDbAdapter = {
  async getUserId() {
    const db = await getDatabase();
    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (!auth?.user_id)
      throw new Error("Cannot create task: userId is not set");
    return auth.user_id;
  },
  async insert(task) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO tasks (id, user_id, title, activity_id, start_date, due_date, done_date, memo, archived_at, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.userId,
        task.title,
        task.activityId,
        task.startDate,
        task.dueDate,
        task.doneDate,
        task.memo,
        task.archivedAt,
        task._syncStatus,
        task.deletedAt,
        task.createdAt,
        task.updatedAt,
      ],
    );
    dbEvents.emit("tasks");
  },
  async getAll(filter) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>("SELECT * FROM tasks");
    return rows.map(mapTaskRow).filter(filter);
  },
  async update(id, changes) {
    const db = await getDatabase();
    const columnMap: Record<string, string> = {
      title: "title",
      activityId: "activity_id",
      startDate: "start_date",
      dueDate: "due_date",
      doneDate: "done_date",
      memo: "memo",
      archivedAt: "archived_at",
      deletedAt: "deleted_at",
      updatedAt: "updated_at",
      _syncStatus: "sync_status",
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
    await db.runAsync(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, vals);
    dbEvents.emit("tasks");
  },
  async getByIds(ids) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    const rows = await db.getAllAsync<SqlRow>(
      `SELECT * FROM tasks WHERE id IN (${ph})`,
      ids,
    );
    return rows.map(mapTaskRow);
  },
  async updateSyncStatus(ids, status) {
    const db = await getDatabase();
    const ph = ids.map(() => "?").join(",");
    await db.runAsync(`UPDATE tasks SET sync_status = ? WHERE id IN (${ph})`, [
      status,
      ...ids,
    ]);
    dbEvents.emit("tasks");
  },
  async bulkUpsertSynced(tasks) {
    const db = await getDatabase();
    try {
      await db.execAsync("BEGIN");
      for (const t of tasks) {
        await db.runAsync(
          `INSERT OR REPLACE INTO tasks (id, user_id, title, activity_id, start_date, due_date, done_date, memo, archived_at, sync_status, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.userId,
            t.title,
            t.activityId,
            t.startDate,
            t.dueDate,
            t.doneDate,
            t.memo,
            t.archivedAt,
            t._syncStatus,
            t.deletedAt,
            t.createdAt,
            t.updatedAt,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (e) {
      await db.execAsync("ROLLBACK");
      throw e;
    }
    dbEvents.emit("tasks");
  },
};

export const taskRepository = newTaskRepository(
  adapter,
) satisfies TaskRepository;
