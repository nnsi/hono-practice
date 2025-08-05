import { useMemo, useState } from "react";

import type { GetActivityResponse, GoalResponse } from "@dtos/response";

export type GoalPageDependencies = {
  goalsData: { goals: GoalResponse[] } | null;
  goalsLoading: boolean;
  activitiesData: GetActivityResponse[] | null;
};

export function createUseNewGoalPage(dependencies: GoalPageDependencies) {
  const { goalsData, goalsLoading, activitiesData } = dependencies;

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const goals = goalsData?.goals || [];
  const activities = activitiesData || [];

  // 現在の日付を取得
  const now = new Date();

  // 現在の目標と過去の目標を分ける
  const currentGoals = useMemo(() => {
    return goals.filter((goal) => {
      // 期間終了日がない、または期間終了日が未来の場合は現在の目標
      return !goal.endDate || new Date(goal.endDate) >= now;
    });
  }, [goals]);

  const pastGoals = useMemo(() => {
    return goals.filter((goal) => {
      // 期間終了日があり、かつ過去の場合は過去の目標
      return goal.endDate && new Date(goal.endDate) < now;
    });
  }, [goals]);

  const getActivityName = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return activity?.name || "不明なアクティビティ";
  };

  const getActivityEmoji = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return activity?.emoji || "🎯";
  };

  const getActivityIcon = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return {
      iconType: activity?.iconType || "emoji",
      iconUrl: activity?.iconUrl,
      iconThumbnailUrl: activity?.iconThumbnailUrl,
      emoji: activity?.emoji || "🎯",
    };
  };

  const getActivityUnit = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    return activity?.quantityUnit || "";
  };

  const getActivity = (activityId: string) => {
    return activities.find((a) => a.id === activityId);
  };

  // 編集開始時のハンドラを作成する関数
  const createEditStartHandler = (goalId: string) => {
    return () => setEditingGoalId(goalId);
  };

  // 編集終了時のハンドラ
  const handleEditEnd = () => {
    setEditingGoalId(null);
  };

  // 目標作成完了時のハンドラ
  const handleGoalCreated = () => {
    setEditingGoalId(null);
    setCreateDialogOpen(false);
  };

  return {
    // State
    editingGoalId,
    createDialogOpen,
    setCreateDialogOpen,

    // Data
    goalsLoading,
    currentGoals,
    pastGoals,
    activitiesData: activities,

    // Getters
    getActivityName,
    getActivityEmoji,
    getActivityIcon,
    getActivityUnit,
    getActivity,

    // Handlers
    createEditStartHandler,
    handleEditEnd,
    handleGoalCreated,
  };
}
