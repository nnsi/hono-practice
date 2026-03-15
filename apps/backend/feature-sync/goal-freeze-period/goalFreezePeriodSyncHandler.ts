import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalFreezePeriodRequest } from "@packages/types";
import {
  GetGoalFreezePeriodsV2ResponseSchema,
  SyncGoalFreezePeriodsV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { GoalFreezePeriodSyncUsecase } from "./goalFreezePeriodSyncUsecase";

export function newGoalFreezePeriodSyncHandler(
  uc: GoalFreezePeriodSyncUsecase,
) {
  return {
    getFreezePeriods: getFreezePeriods(uc),
    syncFreezePeriods: syncFreezePeriods(uc),
  };
}

function getFreezePeriods(uc: GoalFreezePeriodSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getFreezePeriods(userId, since);
    const parsed = GetGoalFreezePeriodsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse freeze periods response", 500);
    }
    return parsed.data;
  };
}

function syncFreezePeriods(uc: GoalFreezePeriodSyncUsecase) {
  return async (userId: UserId, periods: UpsertGoalFreezePeriodRequest[]) => {
    const result = await uc.syncFreezePeriods(userId, periods);
    const parsed = SyncGoalFreezePeriodsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync freeze periods response", 500);
    }
    return parsed.data;
  };
}
