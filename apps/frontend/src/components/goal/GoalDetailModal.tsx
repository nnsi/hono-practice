import { useMemo } from "react";

import { useGoal, useGoalStats } from "@frontend/hooks";
import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema, type GoalResponse } from "@dtos/response";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui";

import { ActivityIcon } from "../common/ActivityIcon";

type GoalDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  hideGraph?: boolean;
};

type GoalStats = {
  daysUntilDeadline?: number;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  activeDays: number;
  maxDaily: number;
  maxConsecutiveDays: number;
  daysAchieved: number;
};

const calculateGoalStats = (
  goal: GoalResponse | null | undefined,
): GoalStats => {
  const stats: GoalStats = {
    currentProgress: 0,
    targetProgress: 0,
    progressPercentage: 0,
    activeDays: 0,
    maxDaily: 0,
    maxConsecutiveDays: 0,
    daysAchieved: 0,
  };

  if (!goal) {
    return stats;
  }

  const today = new Date();
  const endDate = goal.endDate ? new Date(goal.endDate) : null;

  // 期限までの日数
  if (endDate && today < endDate) {
    stats.daysUntilDeadline = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // 現在の進捗と目標
  stats.currentProgress = goal.totalActual;
  stats.targetProgress = goal.totalTarget;
  stats.progressPercentage =
    stats.targetProgress > 0
      ? Math.min(100, (stats.currentProgress / stats.targetProgress) * 100)
      : 0;

  return stats;
};

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  open,
  onOpenChange,
  goalId,
  hideGraph = false,
}) => {
  const { data: goalData } = useGoal(goalId);
  const { data: statsData, isLoading } = useGoalStats(goalId, open);

  const { data: activitiesData } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await apiClient.users.activities.$get();
      const json = await res.json();
      const parsed = GetActivitiesResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse activities");
      }
      return parsed.data;
    },
  });

  const goal = goalData;

  // 過去目標（終了日が現在より前）の判定
  const isPastGoal = useMemo(() => {
    if (!goal || !goal.endDate) return false;
    return new Date(goal.endDate) < new Date();
  }, [goal]);
  const activity = activitiesData?.find((a) => a.id === goal?.activityId);
  const activityName = activity?.name || "不明なアクティビティ";
  const activityEmoji = activity?.emoji || "🎯";
  const quantityUnit = activity?.quantityUnit || "";

  const stats = useMemo(() => {
    if (!goal) {
      return calculateGoalStats(goal);
    }

    if (!statsData || isLoading) {
      return calculateGoalStats(goal);
    }

    // 実際の統計データを使用
    const { stats: apiStats } = statsData;
    const baseStats = calculateGoalStats(goal);

    return {
      ...baseStats,
      activeDays: statsData.dailyRecords.filter((record) => record.quantity > 0)
        .length,
      maxDaily: apiStats.max,
      maxConsecutiveDays: apiStats.maxConsecutiveDays,
      daysAchieved: apiStats.achievedDays,
    };
  }, [goal, statsData, isLoading]);

  if (!goal) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activity ? (
              <ActivityIcon activity={activity} size="medium" />
            ) : (
              <span className="text-2xl">{activityEmoji}</span>
            )}
            <span>{activityName}</span>
          </DialogTitle>
          <DialogDescription>
            {goal && (
              <>
                {new Date(goal.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                {goal.endDate
                  ? new Date(goal.endDate).toLocaleDateString("ja-JP")
                  : ""}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stats.daysUntilDeadline !== undefined && (
            <div className="text-center py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期限まで</p>
              <p className="text-2xl font-bold">{stats.daysUntilDeadline}日</p>
            </div>
          )}

          {!hideGraph && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{isPastGoal ? "活動量" : "現在の活動量"}</span>
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
          )}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の活動日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.activeDays : "-"}日
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の最大活動量</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.maxDaily : "-"}
                {statsData && !isLoading ? quantityUnit : ""}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">最大連続活動日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.maxConsecutiveDays : "-"}日
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">目標達成日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.daysAchieved : "-"}日
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
