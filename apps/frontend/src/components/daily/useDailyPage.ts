import { useCallback, useMemo, useState } from "react";

import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/useDailyPage";
import { useLiveQuery } from "dexie-react-hooks";

import { activityLogRepository } from "../../db/activityLogRepository";
import type {
  DexieActivity,
  DexieActivityKind,
  SyncStatus,
} from "../../db/schema";
import { db } from "../../db/schema";
import { taskRepository } from "../../db/taskRepository";
import { useActivitiesIncludingDeleted } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import {
  useActiveTaskSchedules,
  useTasksByDate,
  useTasksOnScheduledDate,
} from "../../hooks/useTasks";
import { syncEngine } from "../../sync/syncEngine";

/** 編集ダイアログに渡せるよう、Dexie の実 Task 行の型で findEditableTask を型付けする */
type TaskWithSync = TaskRecord & { _syncStatus: SyncStatus };

export const useDailyPage = createUseDailyPage<
  DexieActivity,
  DexieActivityKind,
  TaskWithSync
>({
  react: { useState, useMemo, useCallback },
  useActivities: useActivitiesIncludingDeleted,
  useActivityLogsByDate,
  useTasksByDate: (date) => {
    const { tasks } = useTasksByDate(date);
    return tasks;
  },
  useAllKinds: () => useLiveQuery(() => db.activityKinds.toArray(), []),
  useActiveTaskSchedules,
  useTasksOnScheduledDate,
  taskRepository,
  activityLogRepository,
  syncEngine,
});
