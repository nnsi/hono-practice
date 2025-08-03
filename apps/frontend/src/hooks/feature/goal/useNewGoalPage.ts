import { useActivities } from "@frontend/hooks/api/useActivities";
import { useGoals } from "@frontend/hooks/api/useGoals";
import { createUseNewGoalPage } from "@packages/frontend-shared";

export const useNewGoalPage = () => {
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: activitiesData } = useActivities();

  // Use the common hook with React Query data
  return createUseNewGoalPage({
    goalsData: goalsData || null,
    goalsLoading: goalsLoading,
    activitiesData: activitiesData || null,
  });
};
