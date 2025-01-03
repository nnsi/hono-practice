import type { GoalRepository } from "@/backend/feature/goal";

import type { UserId } from "../user";
import type { Goal } from "./goal";

// ドメインモデルに閉じられない処理を実装する

// 既に親ゴールが存在するゴールを子ゴールにはできない
// 目標が達成されたかどうかを判定する
export type GoalService = {
  validateCreateGoal: (userId: UserId, goal: Goal) => Promise<boolean>;
  validateUpdateGoal: (userId: UserId, goal: Goal) => Promise<boolean>;
  checkActivityGoalCompleted: (goal: Goal) => boolean;
  checkTaskGoalCompleted: (goal: Goal) => boolean;
  checkCompositeGoalCompleted: (goal: Goal) => boolean;
  checkGoalCompleted: (goal: Goal) => boolean;
};

export function newGoalService(repo: GoalRepository): GoalService {
  console.log(repo);
  return {
    async validateCreateGoal(userId, goal) {
      // ゴールの作成時のバリデーション
      console.log(userId, goal);

      return true;
    },
    async validateUpdateGoal(userId, goal) {
      // ゴールの更新時のバリデーション
      console.log(userId, goal);

      return true;
    },
    checkActivityGoalCompleted(goal) {
      // アクティビティゴールの達成判定
      console.log(goal);

      return true;
    },
    checkTaskGoalCompleted(goal) {
      // タスクゴールの達成判定
      console.log(goal);

      return true;
    },
    checkCompositeGoalCompleted(goal) {
      // 複合ゴールの達成判定
      console.log(goal);

      return true;
    },
    checkGoalCompleted(goal) {
      // ゴールの達成判定
      console.log(goal);

      return true;
    },
  };
}
