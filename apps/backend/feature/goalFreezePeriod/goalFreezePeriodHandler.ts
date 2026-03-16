import { AppError } from "@backend/error";
import type {
  CreateFreezePeriodRequest,
  UpdateFreezePeriodRequest,
} from "@packages/types/request";
import {
  FreezePeriodResponseSchema,
  GetFreezePeriodsResponseSchema,
} from "@packages/types/response";
import type { UserId } from "@packages/domain/user/userSchema";

import type { GoalFreezePeriodUsecase } from "./goalFreezePeriodUsecase";

export function newGoalFreezePeriodHandler(uc: GoalFreezePeriodUsecase) {
  return {
    getFreezePeriods: getFreezePeriods(uc),
    createFreezePeriod: createFreezePeriod(uc),
    updateFreezePeriod: updateFreezePeriod(uc),
    deleteFreezePeriod: deleteFreezePeriod(uc),
  };
}

function getFreezePeriods(uc: GoalFreezePeriodUsecase) {
  return async (userId: UserId, goalId: string) => {
    const freezePeriods = await uc.getFreezePeriods(userId, goalId);

    const parsed = GetFreezePeriodsResponseSchema.safeParse({ freezePeriods });
    if (!parsed.success) {
      throw new AppError("failed to parse freeze periods", 500);
    }

    return parsed.data;
  };
}

function createFreezePeriod(uc: GoalFreezePeriodUsecase) {
  return async (
    userId: UserId,
    goalId: string,
    params: CreateFreezePeriodRequest,
  ) => {
    const created = await uc.createFreezePeriod(userId, goalId, {
      startDate: params.startDate,
      endDate: params.endDate ?? null,
    });

    const parsed = FreezePeriodResponseSchema.safeParse(created);
    if (!parsed.success) {
      throw new AppError("failed to parse freeze period", 500);
    }

    return parsed.data;
  };
}

function updateFreezePeriod(uc: GoalFreezePeriodUsecase) {
  return async (
    userId: UserId,
    goalId: string,
    id: string,
    params: UpdateFreezePeriodRequest,
  ) => {
    const updated = await uc.updateFreezePeriod(userId, goalId, id, {
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const parsed = FreezePeriodResponseSchema.safeParse(updated);
    if (!parsed.success) {
      throw new AppError("failed to parse freeze period", 500);
    }

    return parsed.data;
  };
}

function deleteFreezePeriod(uc: GoalFreezePeriodUsecase) {
  return async (userId: UserId, goalId: string, id: string) => {
    await uc.deleteFreezePeriod(userId, goalId, id);
    return { success: true };
  };
}
