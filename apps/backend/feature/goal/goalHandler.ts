import type {
  CreateDebtGoalRequest,
  CreateMonthlyGoalRequest,
} from "@dtos/request";
import { GetGoalsResponseSchema, GoalResponseSchema } from "@dtos/response";

import { AppError } from "../../error";

import type {
  GoalUsecase,
  GoalType,
  GoalFilters,
  UpdateGoalRequest,
  UpdateDebtGoalRequest,
  UpdateMonthlyGoalRequest,
} from "./goalUsecase";
import type { UserId } from "@backend/domain";

export function newGoalHandler(uc: GoalUsecase) {
  return {
    getGoals: getGoals(uc),
    getGoal: getGoal(uc),
    createDebtGoal: createDebtGoal(uc),
    createMonthlyGoal: createMonthlyGoal(uc),
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
  return async (userId: UserId, goalId: string, type: GoalType) => {
    const goal = await uc.getGoal(userId, goalId, type);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("getGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function createDebtGoal(uc: GoalUsecase) {
  return async (userId: UserId, params: CreateDebtGoalRequest) => {
    const goal = await uc.createDebtGoal(userId, params);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("createDebtGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function createMonthlyGoal(uc: GoalUsecase) {
  return async (userId: UserId, params: CreateMonthlyGoalRequest) => {
    const goal = await uc.createMonthlyGoal(userId, params);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("createMonthlyGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function updateGoal(uc: GoalUsecase) {
  return async (
    userId: UserId,
    goalId: string,
    type: GoalType,
    params: UpdateGoalRequest,
  ) => {
    const goal = await uc.updateGoal(userId, goalId, type, params);

    const parsedGoal = GoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("updateGoalHandler: failed to parse goal", 500);
    }

    return parsedGoal.data;
  };
}

function deleteGoal(uc: GoalUsecase) {
  return async (userId: UserId, goalId: string, type: GoalType) => {
    await uc.deleteGoal(userId, goalId, type);
    return { success: true };
  };
}
