import type { TaskRecord } from "./taskRecord";
import type { Syncable } from "../sync/syncableRecord";

export type CreateTaskInput = {
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  memo?: string;
};

export type UpdateTaskInput = Partial<
  Pick<TaskRecord, "title" | "startDate" | "dueDate" | "doneDate" | "memo">
>;

export type TaskRepository = {
  createTask(input: CreateTaskInput): Promise<Syncable<TaskRecord>>;
  getAllActiveTasks(): Promise<Syncable<TaskRecord>[]>;
  getArchivedTasks(): Promise<Syncable<TaskRecord>[]>;
  getTasksByDate(date: string): Promise<Syncable<TaskRecord>[]>;
  updateTask(id: string, changes: UpdateTaskInput): Promise<void>;
  archiveTask(id: string): Promise<void>;
  softDeleteTask(id: string): Promise<void>;
  getPendingSyncTasks(): Promise<Syncable<TaskRecord>[]>;
  markTasksSynced(ids: string[]): Promise<void>;
  markTasksFailed(ids: string[]): Promise<void>;
  upsertTasksFromServer(tasks: TaskRecord[]): Promise<void>;
};
