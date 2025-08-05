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

  // Use React Query data for tasks
  const tasks =
    commonResult.activeTab === "active" ? activeTasksQuery.data : undefined;
  const archivedTasks =
    commonResult.activeTab === "archived" ? archivedTasksQuery.data : undefined;

  // Re-calculate groupedTasks with the actual React Query data
  const groupedTasks = useMemo(() => {
    return groupTasksByTimeline(tasks || [], {
      showCompleted: commonResult.showCompleted,
      showFuture: commonResult.showFuture,
      completedInTheirCategories: true,
    });
  }, [tasks, commonResult.showCompleted, commonResult.showFuture]);

  // Re-calculate hasAnyTasks with the actual groupedTasks
  const hasAnyTasks = Object.values(groupedTasks).some(
    (group) => group.length > 0,
  );

  const hasAnyArchivedTasks = archivedTasks && archivedTasks.length > 0;

  // Override with React Query data for consistency
  return {
    ...commonResult,
    // Use React Query's loading states
    isTasksLoading: activeTasksQuery.isLoading,
    isArchivedTasksLoading: archivedTasksQuery.isLoading,
    // Use React Query's data and recalculated values
    tasks,
    archivedTasks,
    groupedTasks,
    hasAnyTasks,
    hasAnyArchivedTasks,
  };
};
