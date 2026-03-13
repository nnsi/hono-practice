import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalFreezePeriodRequest } from "@packages/types";
import {
  GetGoalFreezePeriodsV2ResponseSchema,
  SyncGoalFreezePeriodsV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { GoalFreezePeriodV2Usecase } from "./goalFreezePeriodV2Usecase";

export function newGoalFreezePeriodV2Handler(uc: GoalFreezePeriodV2Usecase) {
  return {
    getFreezePeriods: getFreezePeriods(uc),
    syncFreezePeriods: syncFreezePeriods(uc),
  };
}

function getFreezePeriods(uc: GoalFreezePeriodV2Usecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getFreezePeriods(userId, since);
    const parsed = GetGoalFreezePeriodsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse freeze periods response", 500);
    }
    return parsed.data;
  };
}

function syncFreezePeriods(uc: GoalFreezePeriodV2Usecase) {
  return async (userId: UserId, periods: UpsertGoalFreezePeriodRequest[]) => {
    const result = await uc.syncFreezePeriods(userId, periods);
    const parsed = SyncGoalFreezePeriodsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync freeze periods response", 500);
    }
    return parsed.data;
  };
}
