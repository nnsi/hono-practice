import { useEffect, useMemo, useState } from "react";

import {
  createUseArchivedTasks,
  createUseTasks as createUseTasksBase,
} from "@frontend-shared/hooks";
import {
  type GroupedTasks,
  groupTasksByTimeline,
} from "@frontend-shared/hooks/feature";

import { apiClient } from "../utils/apiClient";

export function useTasks() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Fetch active tasks
  const {
    data: activeTasks = [],
    isLoading: isTasksLoading,
    refetch,
  } = createUseTasksBase({
    apiClient,
    includeArchived: false,
  });

  // Fetch archived tasks
  const { data: archivedTasks = [], isLoading: isArchivedTasksLoading } =
    createUseArchivedTasks({
      apiClient,
      enabled: activeTab === "archived",
    });

  // Group tasks by timeline
  const groupedTasks = useMemo(() => {
    return groupTasksByTimeline(activeTasks, {
      showCompleted,
      showFuture,
      completedInTheirCategories: true,
    });
  }, [activeTasks, showCompleted, showFuture]);

  const hasAnyTasks = Object.values(groupedTasks).some(
    (group) => group.length > 0,
  );

  const hasAnyArchivedTasks = archivedTasks.length > 0;

  return {
    // State
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    activeTab,
    setActiveTab,

    // Data
    groupedTasks,
    archivedTasks,
    isTasksLoading,
    isArchivedTasksLoading,
    hasAnyTasks,
    hasAnyArchivedTasks,

    // Actions
    refetch,
  };
}
