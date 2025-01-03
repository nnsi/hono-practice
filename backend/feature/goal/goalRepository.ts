import type { Goal, GoalId, UserId } from "@/backend/domain";
import type { QueryExecutor } from "@/backend/infra/drizzle";

export type GoalRepository = {
  getGoalsByUserId(userId: UserId): Promise<Goal[]>;
  getGoalByIdAndUserId(id: GoalId, userId: UserId): Promise<Goal>;
  createGoal: (goal: Goal) => Promise<Goal>;
  updateGoal: (goal: Goal) => Promise<Goal>;
  deleteGoal: (id: GoalId) => Promise<void>;
};

export function newGoalRepository(db: QueryExecutor) {
  console.log(db);
  return {};
}
