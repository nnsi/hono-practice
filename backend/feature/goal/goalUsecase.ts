// import type { GoalRepository } from "./goalRepository";

export type GoalUsecase = {
  getGoals: () => void;
  getGoal: () => void;
  createGoal: () => void;
  updateGoal: () => void;
  deleteGoal: () => void;
};

export function newGoalUsecase(repo: any) {
  console.log(repo);
  return {};
}
