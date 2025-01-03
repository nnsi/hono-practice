import type { UserId } from "@/backend/domain";
import type { GetGoalResponse, GetGoalsResponse } from "@/types/response";

// import type { GoalUsecase } from "./goalUsecase";

export type GoalHandler = {
  getGoals: (userId: UserId, query: {}) => Promise<GetGoalsResponse>;
  getGoal: (userId: UserId) => Promise<GetGoalResponse>;
  createGoal: (
    userId: UserId,
    // params: CreateGoalRequest,
  ) => Promise<GetGoalsResponse>;
  updateGoal: (
    userId: UserId,
    // params: UpdateGoalRequest,
  ) => Promise<GetGoalsResponse>;
  deleteGoal: (userId: UserId) => Promise<void>;
};

export function newGoalHandler(uc: any) {
  console.log(uc);
  return {};
}
