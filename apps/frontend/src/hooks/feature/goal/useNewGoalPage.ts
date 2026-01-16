import { useActivities } from "@frontend/hooks/api/useActivities";
import { useGoals } from "@frontend/hooks/api/useGoals";
import { createUseNewGoalPage } from "@packages/frontend-shared/hooks/feature";

export const useNewGoalPage = () => {
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: activitiesData } = useActivities();

  const { stateProps, actions } = createUseNewGoalPage({
    goalsData: goalsData || null,
    goalsLoading,
    activitiesData: activitiesData || null,
  });

  // 後方互換性を維持しながら新しいAPIも公開
  return {
    ...stateProps,
    ...actions,
    // 旧API: setCreateDialogOpenを維持
    setCreateDialogOpen: actions.onCreateDialogOpenChange,
    handleEditEnd: actions.onEditEnd,
    handleGoalCreated: actions.onGoalCreated,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
