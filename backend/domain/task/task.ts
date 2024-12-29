import { createUserId, type UserId } from "../user";

import { createTaskId, type TaskId } from "./taskId";

type BaseTask = {
  id: TaskId;
  userId: UserId;
  title: string;
  done: boolean;
  memo: string | null;
};

type PersistedTask = BaseTask & {
  createdAt: Date;
  updatedAt: Date;
};

export type Task = BaseTask | PersistedTask;

function createTask(params: {
  id?: string | TaskId;
  userId: string | UserId;
  title: string;
  done: boolean;
  memo: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): Task {
  const id = createTaskId(params.id);
  const userId = createUserId(params.userId);

  return {
    ...params,
    id,
    userId,
  };
}

function updateTask(
  task: Task,
  params: Partial<Omit<BaseTask, "id" | "userId">>,
): Task {
  return {
    ...task,
    ...params,
  };
}

export const Task = {
  create: createTask,
  update: updateTask,
};
