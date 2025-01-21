import type { UserId } from "../user";
import type { Goal } from "./goal";

// ドメインモデルに閉じられない処理を実装する

// 既に親ゴールが存在するゴールを子ゴールにはできない
// 目標が達成されたかどうかを判定する
export type GoalService = {
  validateCreateGoal: (userId: UserId, goal: Goal) => Promise<boolean>;
  validateUpdateGoal: (userId: UserId, goal: Goal) => Promise<boolean>;
  checkGoalCompleted: (goal: Goal) => boolean;
};
/*

import type {
  ActivityLogRepository,
  ActivityRepository,
  GoalRepository,
  TaskRepository,
} from "@backend/feature";
import type { TransactionRunner } from "@backend/infra/db";

export function newGoalService(
  goalRepo: GoalRepository,
  taskRepo: TaskRepository,
  acRepo: ActivityRepository,
  aclRepo: ActivityLogRepository,
  tx: TransactionRunner,
): GoalService {
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
    checkGoalCompleted(goal) {
      tx.run([goalRepo, taskRepo, acRepo, aclRepo], async (txRepos) => {
        // ゴールが達成されたかどうかを判定する
        const tasks = await txRepos.getTasksByGoalId(goal.id);
        const activities = await txRepos.getActivitiesByGoalId(goal.id);

        // タスクもアクティビティも登録されていない場合は終了
        if(tasks.length === 0 && activities.length === 0) return false;

        // 登録されている全てのタスクが完了しているかどうか
        const completedTasks = tasks.filter((t) => t.completedAt !== null);
        if (tasks.length !== completedTasks.length) return false;

        // アクティビティが単一の場合、アクティビティが目標を達成しているかどうか

        // タスクが無い場合、アクティビティが1つ以外の場合は全てのタスクが完了している
        if (activities.length !== 1) return true;

        if (!goal.quantity) return false;
        const activityLogs = await txRepos.getActivityLogsByActivityIdAndPeriod(
          activities[0].id,
          goal.startDate,
          goal.dueDate,
        );
        const total = activityLogs.reduce((acc, cur) => acc + cur.quantity, 0);

        return total >= goal.quantity;
      });

      return true;
    },
  };
}
*/
