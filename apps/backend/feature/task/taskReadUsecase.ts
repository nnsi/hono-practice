import { ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { TaskId } from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { TaskRepository } from ".";
export function getTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, date?: string) => {
    return await tracer.span("db.getTasksByUserId", () =>
      repo.getTasksByUserId(userId, date),
    );
  };
}

export function getArchivedTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    return await tracer.span("db.getArchivedTasksByUserId", () =>
      repo.getArchivedTasksByUserId(userId),
    );
  };
}

export function getTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    return task;
  };
}

export function deleteTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    await tracer.span("db.deleteTask", () => repo.deleteTask(task));

    return;
  };
}

export function archiveTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const archivedTask = await tracer.span("db.archiveTask", () =>
      repo.archiveTask(userId, taskId),
    );
    if (!archivedTask) throw new ResourceNotFoundError("task not found");

    return archivedTask;
  };
}
