import { useState, useMemo } from "react";
import { createUseTasksPage } from "@packages/frontend-shared/hooks/useTasksPage";
import { useActiveTasks, useArchivedTasks } from "../../hooks/useTasks";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";

export const useTasksPage = createUseTasksPage({
  react: { useState, useMemo },
  useActiveTasks,
  useArchivedTasks,
  taskRepository,
  syncEngine,
});
