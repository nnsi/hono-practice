import type { UserId } from "@packages/domain/user/userSchema";
import type { UpsertGoalRequest } from "@packages/types-v2";

import type { GoalV2Usecase } from "./goalV2Usecase";

export function newGoalV2Handler(uc: GoalV2Usecase) {
  return {
    getGoals: getGoals(uc),
    syncGoals: syncGoals(uc),
  };
}

function getGoals(uc: GoalV2Usecase) {
  return async (userId: UserId, since?: string) => {
    return await uc.getGoals(userId, since);
  };
}

function syncGoals(uc: GoalV2Usecase) {
  return async (userId: UserId, goals: UpsertGoalRequest[]) => {
    return await uc.syncGoals(userId, goals);
  };
}
