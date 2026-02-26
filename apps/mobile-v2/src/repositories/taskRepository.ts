import type { TaskRecord } from "@packages/domain/task/taskRecord";
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

type TaskWithSync = TaskRecord & { _syncStatus: string };

function mapTaskRow(row: SqlRow): TaskWithSync {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    title: str(row.title),
    startDate: strOrNull(row.start_date),
    dueDate: strOrNull(row.due_date),
    doneDate: strOrNull(row.done_date),
    memo: str(row.memo),
    archivedAt: strOrNull(row.archived_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: str(row.sync_status),
  };
}

// --- Repository ---

type CreateTaskInput = {
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  memo?: string;
};

type UpdateTaskInput = Partial<
  Pick<TaskRecord, "title" | "startDate" | "dueDate" | "doneDate" | "memo">
>;

export const taskRepository = {
  async createTask(input: CreateTaskInput) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = uuidv7();

    const auth = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );

    await db.runAsync(
      `INSERT INTO tasks (id, user_id, title, start_date, due_date, done_date, memo, archived_at, sync_status, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, 'pending', NULL, ?, ?)`,
      [
        id,
        auth?.user_id ?? "",
        input.title,
        input.startDate ?? null,
        input.dueDate ?? null,
        input.memo ?? "",
        now,
        now,
      ],
    );

    dbEvents.emit("tasks");

    return {
      id,
      userId: auth?.user_id ?? "",
      title: input.title,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      doneDate: null,
      memo: input.memo ?? "",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      _syncStatus: "pending",
    };
  },

  async getAllActiveTasks(): Promise<TaskWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL AND archived_at IS NULL",
    );
    return rows.map(mapTaskRow);
  },

  async getArchivedTasks(): Promise<TaskWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL AND archived_at IS NOT NULL",
    );
    return rows.map(mapTaskRow);
  },

  async getTasksByDate(date: string): Promise<TaskWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL AND archived_at IS NULL AND (start_date IS NULL OR start_date <= ?)",
      [date],
    );
    return rows.map(mapTaskRow);
  },

  async updateTask(id: string, changes: UpdateTaskInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const setClauses: string[] = ["updated_at = ?", "sync_status = 'pending'"];
    const values: (string | number | null)[] = [now];

    if (changes.title !== undefined) {
      setClauses.push("title = ?");
      values.push(changes.title);
    }
    if (changes.startDate !== undefined) {
      setClauses.push("start_date = ?");
      values.push(changes.startDate);
    }
    if (changes.dueDate !== undefined) {
      setClauses.push("due_date = ?");
      values.push(changes.dueDate);
    }
    if (changes.doneDate !== undefined) {
      setClauses.push("done_date = ?");
      values.push(changes.doneDate);
    }
    if (changes.memo !== undefined) {
      setClauses.push("memo = ?");
      values.push(changes.memo);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    dbEvents.emit("tasks");
  },

  async archiveTask(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE tasks SET archived_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );

    dbEvents.emit("tasks");
  },

  async softDeleteTask(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE tasks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );

    dbEvents.emit("tasks");
  },

  // --- Sync helpers ---

  async getPendingSyncTasks(): Promise<TaskWithSync[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SqlRow>(
      "SELECT * FROM tasks WHERE sync_status = 'pending'",
    );
    return rows.map(mapTaskRow);
  },

  async markTasksSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE tasks SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("tasks");
  },

  async markTasksFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE tasks SET sync_status = 'failed' WHERE id IN (${placeholders})`,
      ids,
    );
    dbEvents.emit("tasks");
  },

  // --- Server upsert ---

  async upsertTasksFromServer(tasks: TaskRecord[]): Promise<void> {
    const db = await getDatabase();
    for (const t of tasks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO tasks (id, user_id, title, start_date, due_date, done_date, memo, archived_at, sync_status, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
        [
          t.id,
          t.userId,
          t.title,
          t.startDate,
          t.dueDate,
          t.doneDate,
          t.memo,
          t.archivedAt,
          t.deletedAt,
          t.createdAt,
          t.updatedAt,
        ],
      );
    }
    dbEvents.emit("tasks");
  },
};
