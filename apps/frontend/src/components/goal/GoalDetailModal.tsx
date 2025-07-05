import { useMemo } from "react";

import { useGoalStats } from "@frontend/hooks";

import type {
  DebtGoalResponse,
  MonthlyTargetGoalResponse,
} from "@dtos/response";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui";

type GoalDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  goal: DebtGoalResponse | MonthlyTargetGoalResponse;
  activityName: string;
  activityEmoji: string;
  quantityUnit?: string;
};

type GoalStats = {
  daysUntilDeadline?: number;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  averageDaily: number;
  maxDaily: number;
  maxConsecutiveDays: number;
  daysAchieved: number;
};

const calculateGoalStats = (
  goal: DebtGoalResponse | MonthlyTargetGoalResponse,
): GoalStats => {
  // TODO: これらの統計情報を計算するには、日次の活動記録データが必要
  // 現在は仮の値を返す
  const stats: GoalStats = {
    currentProgress: 0,
    targetProgress: 0,
    progressPercentage: 0,
    averageDaily: 0,
    maxDaily: 0,
    maxConsecutiveDays: 0,
    daysAchieved: 0,
  };

  if (goal.type === "debt") {
    const today = new Date();
    const startDate = new Date(goal.startDate);
    const endDate = goal.endDate ? new Date(goal.endDate) : null;

    // 期限までの日数
    if (endDate && today < endDate) {
      stats.daysUntilDeadline = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    // 現在の進捗と目標
    const elapsedDays = Math.max(
      1,
      Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );
    stats.currentProgress = goal.totalActual;
    stats.targetProgress = goal.dailyTargetQuantity * elapsedDays;
    stats.progressPercentage =
      stats.targetProgress > 0
        ? Math.min(100, (stats.currentProgress / stats.targetProgress) * 100)
        : 0;
  } else {
    // monthly_target の場合
    const targetDate = new Date(`${goal.targetMonth}-01`);
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    const today = new Date();

    // 月末までの日数
    if (today < endOfMonth) {
      stats.daysUntilDeadline = Math.ceil(
        (endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    stats.currentProgress = goal.currentQuantity;
    stats.targetProgress = goal.targetQuantity;
    stats.progressPercentage =
      stats.targetProgress > 0
        ? Math.min(100, (stats.currentProgress / stats.targetProgress) * 100)
        : 0;
  }

  return stats;
};

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  isOpen,
  onClose,
  goal,
  activityName,
  activityEmoji,
  quantityUnit = "",
}) => {
  const { data: statsData, isLoading } = useGoalStats(
    goal.type,
    goal.id,
    isOpen,
  );

  const stats = useMemo(() => {
    if (!statsData) {
      return calculateGoalStats(goal);
    }

    // 実際の統計データを使用
    const { stats: apiStats } = statsData;
    const baseStats = calculateGoalStats(goal);

    return {
      ...baseStats,
      averageDaily: apiStats.average,
      maxDaily: apiStats.max,
      maxConsecutiveDays: apiStats.maxConsecutiveDays,
      daysAchieved: apiStats.achievedDays,
    };
  }, [goal, statsData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{activityEmoji}</span>
            <span>{activityName}</span>
          </DialogTitle>
          <DialogDescription>
            {goal.type === "debt" && (
              <>
                {new Date(goal.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                {goal.endDate
                  ? new Date(goal.endDate).toLocaleDateString("ja-JP")
                  : ""}
              </>
            )}
            {goal.type === "monthly_target" &&
              new Date(`${goal.targetMonth}-01`).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
              })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stats.daysUntilDeadline !== undefined && (
            <div className="text-center py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期限まで</p>
              <p className="text-2xl font-bold">{stats.daysUntilDeadline}日</p>
            </div>
          )}

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>現在の活動量</span>
              <span className="font-medium">
                {stats.currentProgress}/{stats.targetProgress}
                {quantityUnit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
            <p className="text-right text-sm text-gray-600 mt-1">
              {stats.progressPercentage.toFixed(1)}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の平均活動量</p>
              <p className="text-lg font-medium">
                {statsData ? Math.round(stats.averageDaily) : "-"}
                {quantityUnit}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の最大活動量</p>
              <p className="text-lg font-medium">
                {statsData ? stats.maxDaily : "-"}
                {quantityUnit}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">最大連続活動日数</p>
              <p className="text-lg font-medium">
                {statsData ? stats.maxConsecutiveDays : "-"}日
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {goal.type === "monthly_target" ? "活動日数" : "目標達成日数"}
              </p>
              <p className="text-lg font-medium">
                {statsData ? stats.daysAchieved : "-"}日
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="pt-4 text-center text-sm text-gray-500">
              統計情報を読み込み中...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
