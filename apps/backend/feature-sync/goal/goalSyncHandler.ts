import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types";
import {
  GetGoalsV2ResponseSchema,
  SyncGoalsV2ResponseSchema,
} from "@packages/types";

import { AppError } from "../../error";
import type { GoalSyncUsecase } from "./goalSyncUsecase";

export function newGoalSyncHandler(uc: GoalSyncUsecase) {
  return {
    getGoals: getGoals(uc),
    syncGoals: syncGoals(uc),
  };
}

function getGoals(uc: GoalSyncUsecase) {
  return async (userId: UserId, since?: string) => {
    const result = await uc.getGoals(userId, since);
    const parsed = GetGoalsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse goals response", 500);
    }
    return parsed.data;
  };
}

function syncGoals(uc: GoalSyncUsecase) {
  return async (userId: UserId, goals: UpsertGoalRequest[]) => {
    const result = await uc.syncGoals(userId, goals);
    const parsed = SyncGoalsV2ResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new AppError("failed to parse sync goals response", 500);
    }
    return parsed.data;
  };
}
