import { useMemo, useState } from "react";

import { createUseTasksPage } from "@packages/frontend-shared/hooks/useTasksPage";

import { useActiveTasks, useArchivedTasks } from "../../hooks/useTasks";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";

export const useTasksPage = createUseTasksPage({
  react: { useState, useMemo },
  useActiveTasks,
  useArchivedTasks,
  taskRepository,
  activityLogRepository,
  syncEngine,
});
