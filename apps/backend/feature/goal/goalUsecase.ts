import {
  type Goal,
  GoalFactory,
  type GoalId,
  type UserId,
} from "@backend/domain";

import type { GoalRepository } from "./goalRepository";

export type GoalUsecase = {
  getGoals: (userId: UserId) => Promise<Goal[]>;
  getGoal: (goalId: GoalId, userId: UserId) => Promise<Goal>;
  createGoal: (userId: UserId, params: any) => Promise<Goal>;
  updateGoal: (goalId: GoalId, userId: UserId, params: any) => Promise<Goal>;
  deleteGoal: (goalId: GoalId, userId: UserId) => Promise<void>;
};

export function newGoalUsecase(repo: GoalRepository) {
  return {
    getGoals: GetGoals(repo),
    getGoal: GetGoal(repo),
    createGoal: CreateGoal(repo),
    updateGoal: UpdateGoal(repo),
    deleteGoal: DeleteGoal(repo),
  };
}

function GetGoals(repo: GoalRepository) {
  return async (userId: UserId) => {
    return await repo.getGoalsByUserId(userId);
  };
}

function GetGoal(repo: GoalRepository) {
  return async (goalId: GoalId, userId: UserId) => {
    const goal = await repo.getGoalByIdAndUserId(goalId, userId);

    if (!goal) {
      throw new Error("Goal not found");
    }

    return goal;
  };
}

function CreateGoal(repo: GoalRepository) {
  return async (userId: UserId, params: any) => {
    const goal = GoalFactory.create({ ...params, userId });

    return await repo.createGoal(goal);
  };
}

function UpdateGoal(repo: GoalRepository) {
  return async (goalId: GoalId, userId: UserId, params: any) => {
    const goal = await repo.getGoalByIdAndUserId(goalId, userId);

    if (!goal) {
      throw new Error("Goal not found");
    }

    GoalFactory.update(goal, params);

    return await repo.updateGoal(goal);
  };
}

function DeleteGoal(repo: GoalRepository) {
  return async (goalId: GoalId, userId: UserId) => {
    const goal = await repo.getGoalByIdAndUserId(goalId, userId);

    if (!goal) {
      throw new Error("Goal not found");
    }

    return await repo.deleteGoal(goal);
  };
}
