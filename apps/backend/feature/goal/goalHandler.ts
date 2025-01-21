import { type UserId, createGoalId } from "@backend/domain";
import { AppError } from "@backend/error";
import {
  type GetGoalResponse,
  GetGoalResponseSchema,
  type GetGoalsResponse,
  GetGoalsResponseSchema,
} from "@dtos/response";

import type { GoalUsecase } from "./goalUsecase";
import type { CreateGoalRequest } from "@dtos/request";
import type { UpdateGoalRequest } from "@dtos/request/UpdateGoalRequest";


export type GoalHandler = {
  getGoals: (userId: UserId) => Promise<GetGoalsResponse>;
  getGoal: (GoalId: string, UserId: UserId) => Promise<GetGoalResponse>;
  createGoal: (
    userId: UserId,
    params: CreateGoalRequest,
  ) => Promise<GetGoalResponse>;
  updateGoal: (
    goalId: string,
    userId: UserId,
    params: UpdateGoalRequest,
  ) => Promise<GetGoalResponse>;
  deleteGoal: (goalId: string, userId: UserId) => Promise<void>;
};

export function newGoalHandler(uc: GoalUsecase): GoalHandler {
  return {
    getGoals: getGoals(uc),
    getGoal: getGoal(uc),
    createGoal: createGoal(uc),
    updateGoal: updateGoal(uc),
    deleteGoal: deleteGoal(uc),
  };
}

function getGoals(uc: GoalUsecase) {
  return async (userId: UserId) => {
    const goals = await uc.getGoals(userId);

    const parsedGoals = GetGoalsResponseSchema.safeParse(goals);
    if (!parsedGoals.success) {
      throw new AppError("failed to parse goals", 500);
    }

    return parsedGoals.data;
  };
}

function getGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId) => {
    const typedGoalId = createGoalId(goalId);

    const goal = await uc.getGoal(typedGoalId, userId);

    const parsedGoal = GetGoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("failed to parse goals", 500);
    }

    return parsedGoal.data;
  };
}

function createGoal(uc: GoalUsecase) {
  return async (userId: UserId, params: any) => {
    const goal = await uc.createGoal(userId, params);

    const parsedGoal = GetGoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      console.log(parsedGoal.error);
      throw new AppError("failed to parse goals", 500);
    }

    return parsedGoal.data;
  };
}

function updateGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId, params: any) => {
    const typedGoalId = createGoalId(goalId);
    const goal = await uc.updateGoal(typedGoalId, userId, params);

    const parsedGoal = GetGoalResponseSchema.safeParse(goal);
    if (!parsedGoal.success) {
      throw new AppError("failed to parse goals", 500);
    }

    return parsedGoal.data;
  };
}

function deleteGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId) => {
    const typedGoalId = createGoalId(goalId);
    await uc.deleteGoal(typedGoalId, userId);
  };
}
