import type { UserId } from "@packages/domain/user/userSchema";
import type {
  UpsertActivityKindRequest,
  UpsertActivityRequest,
} from "@packages/types";
import {
  GetActivitiesV2ResponseSchema,
  SyncActivitiesV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { ActivitySyncUsecase } from "./activitySyncUsecase";

export function newActivitySyncHandler(uc: ActivitySyncUsecase) {
  return {
    getActivities: getActivities(uc),
    syncActivities: syncActivities(uc),
  };
}

function getActivities(uc: ActivitySyncUsecase) {
  return async (userId: UserId) => {
    const result = await uc.getActivities(userId);
    const parsed = GetActivitiesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse activities response", 500);
    }
    return parsed.data;
  };
}

function syncActivities(uc: ActivitySyncUsecase) {
  return async (
    userId: UserId,
    activityList: UpsertActivityRequest[],

    kindList: UpsertActivityKindRequest[],
  ) => {
    const result = await uc.syncActivities(userId, activityList, kindList);
    const parsed = SyncActivitiesV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync activities response", 500);
    }
    return parsed.data;
  };
}
