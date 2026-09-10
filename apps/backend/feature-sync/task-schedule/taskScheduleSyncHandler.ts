import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertTaskScheduleRequest } from "@packages/types";
import {
  GetTaskSchedulesV2ResponseSchema,
  SyncTaskSchedulesV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { TaskScheduleSyncUsecase } from "./taskScheduleSyncUsecase";

export function newTaskScheduleSyncHandler(uc: TaskScheduleSyncUsecase) {
  return {
    getTaskSchedules: getTaskSchedules(uc),
    syncTaskSchedules: syncTaskSchedules(uc),
  };
}

function getTaskSchedules(uc: TaskScheduleSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getTaskSchedules(userId, since);
    const parsed = GetTaskSchedulesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse taskSchedules response", 500);
    }
    return parsed.data;
  };
}

function syncTaskSchedules(uc: TaskScheduleSyncUsecase) {
  return async (
    userId: UserId,
    taskScheduleList: UpsertTaskScheduleRequest[],
  ) => {
    const result = await uc.syncTaskSchedules(userId, taskScheduleList);
    const parsed = SyncTaskSchedulesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync taskSchedules response", 500);
    }
    return parsed.data;
  };
}
