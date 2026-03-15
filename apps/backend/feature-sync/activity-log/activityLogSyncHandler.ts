import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityLogRequest } from "@packages/types";
import {
  GetActivityLogsV2ResponseSchema,
  SyncActivityLogsV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { ActivityLogSyncUsecase } from "./activityLogSyncUsecase";

export function newActivityLogSyncHandler(uc: ActivityLogSyncUsecase) {
  return {
    getActivityLogs: getActivityLogs(uc),
    syncActivityLogs: syncActivityLogs(uc),
  };
}

function getActivityLogs(uc: ActivityLogSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getActivityLogs(userId, since);
    const parsed = GetActivityLogsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse activity logs response", 500);
    }
    return parsed.data;
  };
}

function syncActivityLogs(uc: ActivityLogSyncUsecase) {
  return async (userId: UserId, logs: UpsertActivityLogRequest[]) => {
    const result = await uc.syncActivityLogs(userId, logs);
    const parsed = SyncActivityLogsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync activity logs response", 500);
    }
    return parsed.data;
  };
}
