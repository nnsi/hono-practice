import { createUserId, UserId } from "../user";

import { createTaskId, TaskId } from "./taskId";

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

export const Task = {
  create: createTask,
};
