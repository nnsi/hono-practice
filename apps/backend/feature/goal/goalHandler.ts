import type { UserId } from "@packages/domain/user/userSchema";
import { AppError } from "@backend/error";
import type { CreateGoalRequest, UpdateGoalRequest } from "@dtos/request";
import { GetGoalsResponseSchema, GoalResponseSchema } from "@dtos/response";

import type { GoalFilters, GoalUsecase } from "./goalUsecase";

export function newGoalHandler(uc: GoalUsecase) {
  return {
    getGoals: getGoals(uc),
    getGoal: getGoal(uc),
    createGoal: createGoal(uc),
    updateGoal: updateGoal(uc),
    deleteGoal: deleteGoal(uc),
  };
}

function getGoals(uc: GoalUsecase) {
  return async (userId: UserId, filters?: GoalFilters) => {
    const goals = await uc.getGoals(userId, filters);

    const response = { goals };

    const parsedResponse = GetGoalsResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      throw new AppError("getGoalsHandler: failed to parse goals", 500);
    }

    return parsedResponse.data;
  };
}

function getGoal(uc: GoalUsecase) {
  return async (userId: UserId, goalId: string) => {
    const goal = await uc.getGoal(userId, goalId);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("getGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function createGoal(uc: GoalUsecase) {
  return async (userId: UserId, params: CreateGoalRequest) => {
    const goal = await uc.createGoal(userId, params);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("createGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function updateGoal(uc: GoalUsecase) {
  return async (userId: UserId, goalId: string, params: UpdateGoalRequest) => {
    const goal = await uc.updateGoal(userId, goalId, params);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("updateGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function deleteGoal(uc: GoalUsecase) {
  return async (userId: UserId, goalId: string) => {
    await uc.deleteGoal(userId, goalId);
    return { success: true };
  };
}
