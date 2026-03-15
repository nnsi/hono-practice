import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types";
import {
  GetTasksV2ResponseSchema,
  SyncTasksV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { TaskSyncUsecase } from "./taskSyncUsecase";

export function newTaskSyncHandler(uc: TaskSyncUsecase) {
  return {
    getTasks: getTasks(uc),
    syncTasks: syncTasks(uc),
  };
}

function getTasks(uc: TaskSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getTasks(userId, since);
    const parsed = GetTasksV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse tasks response", 500);
    }
    return parsed.data;
  };
}

function syncTasks(uc: TaskSyncUsecase) {
  return async (userId: UserId, taskList: UpsertTaskRequest[]) => {
    const result = await uc.syncTasks(userId, taskList);
    const parsed = SyncTasksV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync tasks response", 500);
    }
    return parsed.data;
  };
}
