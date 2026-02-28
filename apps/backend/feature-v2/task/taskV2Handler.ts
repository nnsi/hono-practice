import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskRequest } from "@packages/types-v2";

import type { TaskV2Usecase } from "./taskV2Usecase";

export function newTaskV2Handler(uc: TaskV2Usecase) {
  return {
    getTasks: getTasks(uc),
    syncTasks: syncTasks(uc),
  };
}

function getTasks(uc: TaskV2Usecase) {
  return async (userId: UserId, since?: string) => {
    return await uc.getTasks(userId, since);
  };
}

function syncTasks(uc: TaskV2Usecase) {
  return async (userId: UserId, taskList: UpsertTaskRequest[]) => {
    return await uc.syncTasks(userId, taskList);
  };
}
