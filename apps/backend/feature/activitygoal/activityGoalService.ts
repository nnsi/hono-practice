import type { ActivityLogRepository } from "../activityLog";
import type {
  ActivityGoal,
  UserId,
  ActivityId,
  GoalProgress,
  ActivityLog,
} from "@backend/domain";

export type ActivityGoalService = {
  calculateProgress(userId: UserId, goal: ActivityGoal): Promise<GoalProgress>;

  getMonthlyGoals(
    userId: UserId,
    year: number,
    month?: number,
  ): Promise<ActivityGoal[]>;

  updateTarget(goal: ActivityGoal, newTarget: number): Promise<ActivityGoal>;
};

export function newActivityGoalService(
  activityLogRepo: ActivityLogRepository,
): ActivityGoalService {
  return {
    calculateProgress: calculateProgress(activityLogRepo),
    getMonthlyGoals: getMonthlyGoals(),
    updateTarget: updateTarget(),
  };
}

function calculateProgress(activityLogRepo: ActivityLogRepository) {
  return async (userId: UserId, goal: ActivityGoal): Promise<GoalProgress> => {
    // 対象月の開始日と終了日を計算
    const [year, month] = goal.targetMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 月末日

    // 対象月の活動量を取得
    const currentQuantity = await getActivityQuantityInMonth(
      activityLogRepo,
      userId,
      goal.activityId,
      startDate,
      endDate,
    );

    // 進捗率を計算
    const progressRate = Math.min(currentQuantity / goal.targetQuantity, 1);

    // 残り必要量
    const remainingQuantity = Math.max(
      goal.targetQuantity - currentQuantity,
      0,
    );

    // 残り日数を計算
    const today = new Date();
    const lastDayOfMonth = new Date(year, month, 0);
    let remainingDays = 0;

    if (today.getFullYear() === year && today.getMonth() === month - 1) {
      // 現在が対象月の場合、今日から月末までの日数
      remainingDays = Math.max(
        lastDayOfMonth.getDate() - today.getDate() + 1,
        0,
      );
    } else if (today < startDate) {
      // 対象月が未来の場合、月の全日数
      remainingDays = lastDayOfMonth.getDate();
    }
    // 過去の月の場合、remainingDays = 0

    // 目標達成に必要な日割りペース
    const dailyPaceRequired =
      remainingDays > 0 ? remainingQuantity / remainingDays : 0;

    // 達成済みかどうか
    const isAchieved = currentQuantity >= goal.targetQuantity;

    return {
      currentQuantity,
      targetQuantity: goal.targetQuantity,
      progressRate,
      remainingQuantity,
      remainingDays,
      dailyPaceRequired,
      isAchieved,
    };
  };
}

function getMonthlyGoals() {
  return async (
    userId: UserId,
    year: number,
    month?: number,
  ): Promise<ActivityGoal[]> => {
    // この機能は ActivityGoalRepository を使用して実装
    // 現在は簡単な実装として空配列を返す
    return [];
  };
}

function updateTarget() {
  return async (
    goal: ActivityGoal,
    newTarget: number,
  ): Promise<ActivityGoal> => {
    if (goal.type !== "persisted") {
      throw new Error("Cannot update target for non-persisted goal");
    }

    return {
      ...goal,
      targetQuantity: newTarget,
    };
  };
}

// Helper function: 月内の活動量を集計
async function getActivityQuantityInMonth(
  activityLogRepo: ActivityLogRepository,
  userId: UserId,
  activityId: ActivityId,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  // ActivityLogRepositoryを使用して月内の活動量を取得
  const logs = await activityLogRepo.getActivityLogsByUserIdAndDate(
    userId,
    startDate,
    endDate,
  );

  // 指定されたactivityIdのログのみフィルタリングして、quantityの合計を計算
  return logs
    .filter((log: ActivityLog) => log.activity.id === activityId)
    .reduce((total: number, log: ActivityLog) => {
      return total + (log.quantity || 0);
    }, 0);
}
