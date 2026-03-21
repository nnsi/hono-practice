import type {
  SyncStatus,
  Syncable,
} from "@packages/domain/sync/syncableRecord";
import { isTaskVisibleOnDate } from "@packages/domain/task/taskPredicates";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import type {
  CreateTaskInput,
  TaskRepository,
  UpdateTaskInput,
} from "@packages/domain/task/taskRepository";
import { v7 as uuidv7 } from "uuid";

import { filterSafeUpserts } from "./syncHelpers";

export type TaskDbAdapter = {
  getUserId(): Promise<string>;
  insert(task: Syncable<TaskRecord>): Promise<void>;
  getAll(
    filter: (t: Syncable<TaskRecord>) => boolean,
  ): Promise<Syncable<TaskRecord>[]>;
  update(id: string, changes: Partial<Syncable<TaskRecord>>): Promise<void>;
  getByIds(ids: string[]): Promise<Syncable<TaskRecord>[]>;
  updateSyncStatus(ids: string[], status: SyncStatus): Promise<void>;
  bulkUpsertSynced(tasks: Syncable<TaskRecord>[]): Promise<void>;
};

export function newTaskRepository(adapter: TaskDbAdapter): TaskRepository {
  return {
    async createTask(input: CreateTaskInput) {
      const now = new Date().toISOString();
      const userId = await adapter.getUserId();
      const task: Syncable<TaskRecord> = {
        id: uuidv7(),
        userId,
        activityId: input.activityId ?? null,
        activityKindId: input.activityKindId ?? null,
        quantity: input.quantity ?? null,
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
      await adapter.insert(task);
      return task;
    },

    async getAllActiveTasks() {
      return adapter.getAll((t) => !t.deletedAt && !t.archivedAt);
    },

    async getArchivedTasks() {
      return adapter.getAll((t) => !t.deletedAt && !!t.archivedAt);
    },

    async getTasksByDate(date: string) {
      return adapter.getAll((t) => isTaskVisibleOnDate(t, date));
    },

    async updateTask(id: string, changes: UpdateTaskInput) {
      const now = new Date().toISOString();
      await adapter.update(id, {
        ...changes,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async archiveTask(id: string) {
      const now = new Date().toISOString();
      await adapter.update(id, {
        archivedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async softDeleteTask(id: string) {
      const now = new Date().toISOString();
      await adapter.update(id, {
        deletedAt: now,
        updatedAt: now,
        _syncStatus: "pending",
      });
    },

    async getPendingSyncTasks() {
      return adapter.getAll(
        (t) => t._syncStatus === "pending" || t._syncStatus === "failed",
      );
    },

    async markTasksSynced(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "synced");
    },

    async markTasksFailed(ids: string[]) {
      if (ids.length === 0) return;
      await adapter.updateSyncStatus(ids, "failed");
    },

    async upsertTasksFromServer(tasks: TaskRecord[]) {
      if (tasks.length === 0) return;
      const localRecords = await adapter.getByIds(tasks.map((t) => t.id));
      const safe = filterSafeUpserts(tasks, localRecords);
      if (safe.length === 0) return;
      await adapter.bulkUpsertSynced(
        safe.map((t) => ({ ...t, _syncStatus: "synced" as const })),
      );
    },
  };
}
