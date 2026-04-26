import { AppError, ResourceNotFoundError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import {
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import {
  type Task,
  type TaskId,
  createTaskEntity,
  createTaskId,
} from "@packages/domain/task/taskSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "../activity/activityRepository";
import type { TaskRepository } from ".";

export type CreateTaskInputParams = {
  title: string;
  activityId?: string;
  activityKindId?: string;
  quantity?: number;
  startDate?: string;
  dueDate?: string;
  memo?: string;
};

export type UpdateTaskInputParams = {
  title?: string;
  activityId?: string | null;
  activityKindId?: string | null;
  quantity?: number | null;
  doneDate?: string | null;
  memo?: string | null;
  startDate?: string;
  dueDate?: string | null;
};

export type TaskUsecase = {
  getTasks: (userId: UserId, date?: string) => Promise<Task[]>;
  getArchivedTasks: (userId: UserId) => Promise<Task[]>;
  getTask: (userId: UserId, taskId: TaskId) => Promise<Task>;
  createTask: (userId: UserId, params: CreateTaskInputParams) => Promise<Task>;
  updateTask: (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => Promise<Task>;
  deleteTask: (userId: UserId, taskId: TaskId) => Promise<void>;
  archiveTask: (userId: UserId, taskId: TaskId) => Promise<Task>;
};

function assertTaskDateRange(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
) {
  if (startDate != null && dueDate != null && dueDate < startDate) {
    throw new AppError("dueDate must be on or after startDate", 400);
  }
}

export function newTaskUsecase(
  repo: TaskRepository,
  activityRepo: ActivityRepository,
  tracer: Tracer,
): TaskUsecase {
  return {
    getTasks: getTasks(repo, tracer),
    getArchivedTasks: getArchivedTasks(repo, tracer),
    getTask: getTask(repo, tracer),
    createTask: createTask(repo, activityRepo, tracer),
    updateTask: updateTask(repo, activityRepo, tracer),
    deleteTask: deleteTask(repo, tracer),
    archiveTask: archiveTask(repo, tracer),
  };
}

async function assertTaskActivityLink(
  activityRepo: ActivityRepository,
  tracer: Tracer,
  userId: UserId,
  activityId: string | null | undefined,
  activityKindId: string | null | undefined,
) {
  if (activityKindId != null && activityId == null) {
    throw new AppError("activityKindId requires activityId", 400);
  }
  if (activityId == null) return;

  const ownedActivityId = createActivityId(activityId);
  const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
    activityRepo.getActivityByIdAndUserId(userId, ownedActivityId),
  );
  if (!activity) {
    throw new AppError("activityId does not belong to user", 400);
  }
  if (activityKindId == null) return;

  const ownedActivityKindId = createActivityKindId(activityKindId);
  const hasKind = activity.kinds.some(
    (kind) => kind.id === ownedActivityKindId,
  );
  if (!hasKind) {
    throw new AppError("activityKindId does not belong to activity", 400);
  }
}

function getTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, date?: string) => {
    return await tracer.span("db.getTasksByUserId", () =>
      repo.getTasksByUserId(userId, date),
    );
  };
}

function getArchivedTasks(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    return await tracer.span("db.getArchivedTasksByUserId", () =>
      repo.getArchivedTasksByUserId(userId),
    );
  };
}

function getTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    return task;
  };
}

function createTask(
  repo: TaskRepository,
  activityRepo: ActivityRepository,
  tracer: Tracer,
) {
  return async (userId: UserId, params: CreateTaskInputParams) => {
    assertTaskDateRange(params.startDate, params.dueDate);
    const activityId = params.activityId ?? null;
    const activityKindId = params.activityKindId ?? null;
    await assertTaskActivityLink(
      activityRepo,
      tracer,
      userId,
      activityId,
      activityKindId,
    );

    const task = createTaskEntity({
      type: "new",
      id: createTaskId(),
      userId: userId,
      activityId,
      activityKindId,
      quantity: params.quantity ?? null,
      title: params.title,
      startDate: params.startDate || null,
      dueDate: params.dueDate || null,
      doneDate: null,
      memo: params.memo || null,
      archivedAt: null,
    });

    return await tracer.span("db.createTask", () => repo.createTask(task));
  };
}

function updateTask(
  repo: TaskRepository,
  activityRepo: ActivityRepository,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    taskId: TaskId,
    params: UpdateTaskInputParams,
  ) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task)
      throw new ResourceNotFoundError("updateTaskUsecase:task not found");

    // アーカイブ済みタスクは getTaskByUserIdAndTaskId では取得されないため、
    // ここに到達する task は必ず "new" か "persisted" タイプ
    if (task.type === "archived") {
      // 実際にはここに到達しないが、型安全性のため
      throw new ResourceNotFoundError("updateTaskUsecase:task not found");
    }

    const startDate = params.startDate ?? task.startDate;
    const dueDate =
      params.dueDate === undefined ? task.dueDate : params.dueDate;
    assertTaskDateRange(startDate, dueDate);

    const activityIdChanged = params.activityId !== undefined;
    const activityId =
      params.activityId === undefined
        ? (task.activityId ?? null)
        : params.activityId;
    const activityKindId =
      params.activityKindId !== undefined
        ? params.activityKindId
        : activityIdChanged
          ? null
          : (task.activityKindId ?? null);
    if (activityIdChanged || params.activityKindId !== undefined) {
      await assertTaskActivityLink(
        activityRepo,
        tracer,
        userId,
        activityId,
        activityKindId,
      );
    }

    const newTask = createTaskEntity({
      ...task,
      ...params,
      activityId,
      activityKindId,
    });

    const updateTask = await tracer.span("db.updateTask", () =>
      repo.updateTask(newTask),
    );
    if (!updateTask)
      throw new ResourceNotFoundError("updateTaskUsecasetask not found");

    return updateTask;
  };
}

function deleteTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const task = await tracer.span("db.getTaskByUserIdAndTaskId", () =>
      repo.getTaskByUserIdAndTaskId(userId, taskId),
    );
    if (!task) throw new ResourceNotFoundError("task not found");

    await tracer.span("db.deleteTask", () => repo.deleteTask(task));

    return;
  };
}

function archiveTask(repo: TaskRepository, tracer: Tracer) {
  return async (userId: UserId, taskId: TaskId) => {
    const archivedTask = await tracer.span("db.archiveTask", () =>
      repo.archiveTask(userId, taskId),
    );
    if (!archivedTask) throw new ResourceNotFoundError("task not found");

    return archivedTask;
  };
}
