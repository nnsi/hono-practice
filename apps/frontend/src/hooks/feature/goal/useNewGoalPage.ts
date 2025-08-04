import { useCallback, useState } from "react";

import { useActivities } from "@frontend/hooks/api/useActivities";
import { useGoals } from "@frontend/hooks/api/useGoals";

import type { GetActivityResponse, GoalResponse } from "@dtos/response";

export const useNewGoalPage = () => {
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: activitiesData } = useActivities();
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Split goals into current and past
  const currentGoals =
    goalsData?.goals?.filter((goal: GoalResponse) => goal.isActive) || [];
  const pastGoals =
    goalsData?.goals?.filter((goal: GoalResponse) => !goal.isActive) || [];

  // Helper functions
  const getActivity = useCallback(
    (activityId: string) => {
      return activitiesData?.find(
        (a: GetActivityResponse) => a.id === activityId,
      );
    },
    [activitiesData],
  );

  const getActivityName = useCallback(
    (activityId: string) => {
      const activity = getActivity(activityId);
      return activity?.name || "Unknown Activity";
    },
    [getActivity],
  );

  const getActivityEmoji = useCallback(
    (activityId: string) => {
      const activity = getActivity(activityId);
      return activity?.emoji || "🎯";
    },
    [getActivity],
  );

  const getActivityUnit = useCallback(
    (activityId: string) => {
      const activity = getActivity(activityId);
      return activity?.quantityUnit || "回";
    },
    [getActivity],
  );

  const createEditStartHandler = useCallback((goalId: string) => {
    return () => setEditingGoalId(goalId);
  }, []);

  const handleEditEnd = useCallback(() => {
    setEditingGoalId(null);
  }, []);

  const handleGoalCreated = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  return {
    editingGoalId,
    createDialogOpen,
    setCreateDialogOpen,
    goalsLoading,
    currentGoals,
    pastGoals,
    activitiesData,
    getActivityName,
    getActivityEmoji,
    getActivityUnit,
    getActivity,
    createEditStartHandler,
    handleEditEnd,
    handleGoalCreated,
  };
};
