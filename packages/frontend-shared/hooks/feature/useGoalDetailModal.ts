import { useMemo } from "react";

import type { GoalResponse } from "@dtos/response";

import { createUseActivities, createUseGoalStats } from "../";

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

type UseGoalDetailModalDependencies = {
  apiClient: any;
};

export const createUseGoalDetailModal = (
  deps: UseGoalDetailModalDependencies,
) => {
  const { apiClient } = deps;
  const useActivities = createUseActivities({ apiClient });

  return (goalId: string, goalProp: GoalResponse, open: boolean) => {
    // 親から渡されたgoalデータを使用し、リクエストを避ける
    const { data: statsData, isLoading } = createUseGoalStats({
      apiClient,
      id: goalId,
      enabled: open,
    });
    const { activities: activitiesData } = useActivities();

    const goal = goalProp;

    // 過去目標（終了日が現在より前）の判定
    const isPastGoal = useMemo(() => {
      if (!goal || !goal.endDate) return false;
      return new Date(goal.endDate) < new Date();
    }, [goal]);

    const activity = activitiesData?.find(
      (a: any) => a.id === goal?.activityId,
    );
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
        activeDays: statsData.dailyRecords.filter(
          (record: any) => record.quantity > 0,
        ).length,
        maxDaily: apiStats.max,
        maxConsecutiveDays: apiStats.maxConsecutiveDays,
        daysAchieved: apiStats.achievedDays,
      };
    }, [goal, statsData, isLoading]);

    return {
      stateProps: {
        goal,
        stats,
        isPastGoal,
        activity,
        activityName,
        activityEmoji,
        quantityUnit,
        isLoading,
        statsData,
      },
    };
  };
};
