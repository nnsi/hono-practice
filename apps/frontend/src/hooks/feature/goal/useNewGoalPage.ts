import { useActivities } from "@frontend/hooks/api/useActivities";
import { useGoals } from "@frontend/hooks/api/useGoals";
import { createUseNewGoalPage } from "@packages/frontend-shared/hooks/feature";

export const useNewGoalPage = () => {
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: activitiesData } = useActivities();

  return createUseNewGoalPage({
    goalsData: goalsData || null,
    goalsLoading,
    activitiesData: activitiesData || null,
  });
};
