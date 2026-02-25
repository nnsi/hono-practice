import { v7 as uuidv7 } from "uuid";
import type { TaskRepository } from "@packages/domain/task/taskRepository";
import { db, type DexieTask } from "./schema";

type CreateTaskInput = {
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  memo?: string;
};

type UpdateTaskInput = Partial<
  Pick<DexieTask, "title" | "startDate" | "dueDate" | "doneDate" | "memo">
>;

export const taskRepository = {
  async createTask(input: CreateTaskInput) {
    const now = new Date().toISOString();
    const authState = await db.authState.get("current");
    const task: DexieTask = {
      id: uuidv7(),
      userId: authState?.userId ?? "",
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
    await db.tasks.add(task);
    return task;
  },

  async getAllActiveTasks() {
    return db.tasks.filter((t) => !t.deletedAt && !t.archivedAt).toArray();
  },

  async getArchivedTasks() {
    return db.tasks.filter((t) => !t.deletedAt && !!t.archivedAt).toArray();
  },

  async getTasksByDate(date: string) {
    return db.tasks
      .filter((t) => {
        if (t.deletedAt || t.archivedAt) return false;
        if (t.startDate && t.startDate > date) return false;
        return true;
      })
      .toArray();
  },

  async updateTask(id: string, changes: UpdateTaskInput) {
    const now = new Date().toISOString();
    await db.tasks.update(id, {
      ...changes,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async archiveTask(id: string) {
    const now = new Date().toISOString();
    await db.tasks.update(id, {
      archivedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async softDeleteTask(id: string) {
    const now = new Date().toISOString();
    await db.tasks.update(id, {
      deletedAt: now,
      updatedAt: now,
      _syncStatus: "pending",
    });
  },

  async getPendingSyncTasks() {
    return db.tasks.where("_syncStatus").equals("pending").toArray();
  },

  async markTasksSynced(ids: string[]) {
    if (ids.length === 0) return;
    await db.tasks
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "synced" as const });
  },

  async markTasksFailed(ids: string[]) {
    if (ids.length === 0) return;
    await db.tasks
      .where("id")
      .anyOf(ids)
      .modify({ _syncStatus: "failed" as const });
  },

  async upsertTasksFromServer(tasks: Omit<DexieTask, "_syncStatus">[]) {
    await db.tasks.bulkPut(
      tasks.map((t) => ({ ...t, _syncStatus: "synced" as const })),
    );
  },
} satisfies TaskRepository;
