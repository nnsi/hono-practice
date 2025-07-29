import { useState } from "react";

import { useGoals } from "@frontend/hooks/api";
import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";

export const useNewGoalPage = () => {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: goalsData, isLoading: goalsLoading } = useGoals();

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

  const goals = goalsData?.goals || [];

  // 現在の日付を取得
  const now = new Date();

  // 現在の目標と過去の目標を分ける
  const currentGoals = goals.filter((goal) => {
    // 期間終了日がない、または期間終了日が未来の場合は現在の目標
    return !goal.endDate || new Date(goal.endDate) >= now;
  });

  const pastGoals = goals.filter((goal) => {
    // 期間終了日があり、かつ過去の場合は過去の目標
    return goal.endDate && new Date(goal.endDate) < now;
  });

  const getActivityName = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.name || "不明なアクティビティ";
  };

  const getActivityEmoji = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.emoji || "🎯";
  };

  const getActivityIcon = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return {
      iconType: activity?.iconType || "emoji",
      iconUrl: activity?.iconUrl,
      iconThumbnailUrl: activity?.iconThumbnailUrl,
      emoji: activity?.emoji || "🎯",
    };
  };

  const getActivityUnit = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.quantityUnit || "";
  };

  const getActivity = (activityId: string) => {
    return activitiesData?.find((a) => a.id === activityId);
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
    activitiesData,

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
};
