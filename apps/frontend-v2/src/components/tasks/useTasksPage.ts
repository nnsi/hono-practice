import { useMemo, useState } from "react";

import { createUseTasksPage } from "@packages/frontend-shared/hooks/useTasksPage";

import { taskRepository } from "../../db/taskRepository";
import { useActiveTasks, useArchivedTasks } from "../../hooks/useTasks";
import { syncEngine } from "../../sync/syncEngine";

export const useTasksPage = createUseTasksPage({
  react: { useState, useMemo },
  useActiveTasks,
  useArchivedTasks,
  taskRepository,
  syncEngine,
});
