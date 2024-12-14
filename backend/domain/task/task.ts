import { UserId } from "../user/userId";

import { TaskId } from "./taskId";

type BaseTask = {
  id: TaskId;
  userId: UserId;
  title: string;
  done: boolean;
  memo: string | null;
};

type persistedTask = BaseTask & {
  createdAt: Date;
  updatedAt: Date;
};

export type Task = BaseTask | persistedTask;
