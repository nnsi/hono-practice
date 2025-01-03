import { type UserId, createGoalId } from "@/backend/domain";
import type { GetGoalResponse, GetGoalsResponse } from "@/types/response";

import type { GoalUsecase } from "./goalUsecase";

export type GoalHandler = {
  getGoals: (userId: UserId) => Promise<GetGoalsResponse>;
  getGoal: (GoalId: string, UserId: UserId) => Promise<GetGoalResponse>;
  createGoal: (
    userId: UserId,
    params: any,
    // params: CreateGoalRequest,
  ) => Promise<GetGoalResponse>;
  updateGoal: (
    goalId: string,
    userId: UserId,
    params: any,
    // params: UpdateGoalRequest,
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

    return goals;
  };
}

function getGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId) => {
    const typedGoalId = createGoalId(goalId);

    const goal = await uc.getGoal(typedGoalId, userId);

    return { goal };
  };
}

function createGoal(uc: GoalUsecase) {
  return async (userId: UserId, params: any) => {
    const goal = await uc.createGoal(userId, params);

    return goal;
  };
}

function updateGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId, params: any) => {
    const typedGoalId = createGoalId(goalId);
    const goal = await uc.updateGoal(typedGoalId, userId, params);

    return goal;
  };
}

function deleteGoal(uc: GoalUsecase) {
  return async (goalId: string, userId: UserId) => {
    const typedGoalId = createGoalId(goalId);
    await uc.deleteGoal(typedGoalId, userId);
  };
}
