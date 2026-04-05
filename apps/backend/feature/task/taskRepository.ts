import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { Task, TaskId } from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import { getTaskChangesAfter } from "./taskChangesRepository";
import {
  getArchivedTasksByUserId,
  getTaskByUserIdAndTaskId,
  getTasksByUserId,
} from "./taskQueryRepository";
import {
  archiveTask,
  createTask,
  deleteTask,
  hardDeleteTasksByUserId,
  updateTask,
} from "./taskWriteRepository";

export type TaskRepository<T = QueryExecutor> = {
  getTasksByUserId: (userId: UserId, date?: string) => Promise<Task[]>;
  getArchivedTasksByUserId: (userId: UserId) => Promise<Task[]>;
  getTaskByUserIdAndTaskId: (
    userId: UserId,
    taskId: TaskId,
  ) => Promise<Task | undefined>;
  createTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | undefined>;
  deleteTask: (task: Task) => Promise<void>;
  archiveTask: (userId: UserId, taskId: TaskId) => Promise<Task | undefined>;
  getTaskChangesAfter: (
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ) => Promise<{ tasks: Task[]; hasMore: boolean }>;
  hardDeleteTasksByUserId: (userId: UserId) => Promise<number>;
  withTx: (tx: T) => TaskRepository<T>;
};

export function newTaskRepository(
  db: QueryExecutor,
): TaskRepository<QueryExecutor> {
  return {
    getTasksByUserId: getTasksByUserId(db),
    getArchivedTasksByUserId: getArchivedTasksByUserId(db),
    getTaskByUserIdAndTaskId: getTaskByUserIdAndTaskId(db),
    createTask: createTask(db),
    updateTask: updateTask(db),
    deleteTask: deleteTask(db),
    archiveTask: archiveTask(db),
    getTaskChangesAfter: getTaskChangesAfter(db),
    hardDeleteTasksByUserId: hardDeleteTasksByUserId(db),
    withTx: (tx) => newTaskRepository(tx),
  };
}
