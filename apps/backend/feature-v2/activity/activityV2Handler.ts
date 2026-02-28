import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types-v2";

import type { ActivityV2Usecase } from "./activityV2Usecase";

export function newActivityV2Handler(uc: ActivityV2Usecase) {
  return {
    getActivities: getActivities(uc),
    syncActivities: syncActivities(uc),
  };
}

function getActivities(uc: ActivityV2Usecase) {
  return async (userId: UserId) => {
    return await uc.getActivities(userId);
  };
}

function syncActivities(uc: ActivityV2Usecase) {
  return async (
    userId: UserId,
    activityList: UpsertActivityRequest[],
    kindList: UpsertActivityKindRequest[],
  ) => {
    return await uc.syncActivities(userId, activityList, kindList);
  };
}
