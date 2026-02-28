import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertActivityLogRequest } from "@packages/types-v2";

import type { ActivityLogV2Usecase } from "./activityLogV2Usecase";

export function newActivityLogV2Handler(uc: ActivityLogV2Usecase) {
  return {
    getActivityLogs: getActivityLogs(uc),
    syncActivityLogs: syncActivityLogs(uc),
  };
}

function getActivityLogs(uc: ActivityLogV2Usecase) {
  return async (userId: UserId, since?: string) => {
    return await uc.getActivityLogs(userId, since);
  };
}

function syncActivityLogs(uc: ActivityLogV2Usecase) {
  return async (userId: UserId, logs: UpsertActivityLogRequest[]) => {
    return await uc.syncActivityLogs(userId, logs);
  };
}
