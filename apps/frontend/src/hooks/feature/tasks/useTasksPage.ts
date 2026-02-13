import { useMemo } from "react";

import { useArchivedTasks, useTasks } from "@frontend/hooks/api";
import {
  createUseTasksPage,
  groupTasksByTimeline,
} from "@packages/frontend-shared/hooks/feature";

// 新しい共通化されたフックを使用する実装
export const useTasksPage = () => {
  // API hooks
  const activeTasksQuery = useTasks({ includeArchived: false });
  const archivedTasksQuery = useArchivedTasks(false); // Will be enabled based on tab

  // Create dependencies
  const dependencies = {
    api: {
      getTasks: async (_params: { includeArchived: boolean }) => {
        // Return cached data or fetch if needed
        const result = await activeTasksQuery.refetch();
        return result.data || [];
      },
      getArchivedTasks: async () => {
        // Return cached archived tasks
        const result = await archivedTasksQuery.refetch();
        return result.data || [];
      },
    },
  };

  // Use the common hook
  const commonResult = createUseTasksPage(dependencies);
  const { stateProps, actions } = commonResult;

  // Use React Query data for tasks
  const tasks =
    stateProps.activeTab === "active" ? activeTasksQuery.data : undefined;
  const archivedTasks =
    stateProps.activeTab === "archived" ? archivedTasksQuery.data : undefined;

  // Re-calculate groupedTasks with the actual React Query data
  const groupedTasks = useMemo(() => {
    return groupTasksByTimeline(tasks || [], {
      showCompleted: stateProps.showCompleted,
      showFuture: stateProps.showFuture,
      completedInTheirCategories: true,
    });
  }, [tasks, stateProps.showCompleted, stateProps.showFuture]);

  // 完了済みセクションに表示されるタスク数を計算（表示・非表示に関わらず）
  const allGroupedTasks = useMemo(() => {
    return groupTasksByTimeline(tasks || [], {
      showCompleted: true, // 常に完了済みを含める
      showFuture: stateProps.showFuture,
      completedInTheirCategories: true,
    });
  }, [tasks, stateProps.showFuture]);

  // Re-calculate hasAnyTasks with the actual groupedTasks
  const hasAnyTasks = Object.values(groupedTasks).some(
    (group) => group.length > 0,
  );

  const hasAnyArchivedTasks = archivedTasks && archivedTasks.length > 0;

  // Override with React Query data for consistency
  return {
    // statePropsからの直接公開（後方互換性）
    ...stateProps,
    // 旧API互換のセッター
    setShowCompleted: actions.onShowCompletedChange,
    setShowFuture: actions.onShowFutureChange,
    setCreateDialogOpen: actions.onCreateDialogOpenChange,
    setActiveTab: actions.onActiveTabChange,
    // Use React Query's loading states
    isTasksLoading: activeTasksQuery.isLoading,
    isArchivedTasksLoading: archivedTasksQuery.isLoading,
    // Use React Query's data and recalculated values
    tasks,
    archivedTasks,
    groupedTasks,
    allGroupedTasks,
    hasAnyTasks,
    hasAnyArchivedTasks,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
