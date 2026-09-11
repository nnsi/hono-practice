import { useMemo, useState } from "react";

import { createUseTasksPage } from "@packages/frontend-shared/hooks/useTasksPage";

import { activityLogRepository } from "../../db/activityLogRepository";
import { taskRepository } from "../../db/taskRepository";
import {
  useActiveTaskSchedules,
  useActiveTasks,
  useArchivedTasks,
  useTasksOnScheduledDate,
} from "../../hooks/useTasks";
import { syncEngine } from "../../sync/syncEngine";

export const useTasksPage = createUseTasksPage({
  react: { useState, useMemo },
  useActiveTasks,
  useArchivedTasks,
  useActiveTaskSchedules,
  useTasksOnScheduledDate,
  taskRepository,
  activityLogRepository,
  syncEngine,
});
