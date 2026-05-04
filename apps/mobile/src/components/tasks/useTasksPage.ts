import { useCallback, useMemo, useState } from "react";

import { createUseTasksPage } from "@packages/frontend-shared/hooks/useTasksPage";

import { useActiveTasks, useArchivedTasks } from "../../hooks/useTasks";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { useAppSettings } from "../setting/useAppSettings";

function useShowCompletedTasksState(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void,
] {
  const { settings, updateSetting } = useAppSettings();
  const value = settings.showCompletedTasks;
  const setValue = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === "function" ? next(value) : next;
      updateSetting("showCompletedTasks", resolved);
    },
    [value, updateSetting],
  );
  return [value, setValue];
}

export const useTasksPage = createUseTasksPage({
  react: { useState, useMemo },
  useActiveTasks,
  useArchivedTasks,
  taskRepository,
  activityLogRepository,
  syncEngine,
  useShowCompletedState: useShowCompletedTasksState,
});
