import { useCallback, useMemo, useState } from "react";

import { createUseDailyPage } from "@packages/frontend-shared/hooks/useDailyPage";
import { useLiveQuery } from "dexie-react-hooks";

import { activityLogRepository } from "../../db/activityLogRepository";
import type { DexieActivity, DexieActivityKind } from "../../db/schema";
import { db } from "../../db/schema";
import { taskRepository } from "../../db/taskRepository";
import { useActivitiesIncludingDeleted } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useTasksByDate } from "../../hooks/useTasks";
import { syncEngine } from "../../sync/syncEngine";

export const useDailyPage = createUseDailyPage<
  DexieActivity,
  DexieActivityKind
>({
  react: { useState, useMemo, useCallback },
  useActivities: useActivitiesIncludingDeleted,
  useActivityLogsByDate,
  useTasksByDate: (date) => {
    const { tasks } = useTasksByDate(date);
    return tasks;
  },
  useAllKinds: () => useLiveQuery(() => db.activityKinds.toArray(), []),
  taskRepository,
  activityLogRepository,
  syncEngine,
});
