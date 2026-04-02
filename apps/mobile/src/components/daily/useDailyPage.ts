import { useCallback, useMemo, useState } from "react";

import type { SyncStatus } from "@packages/domain";
import type { ActivityKindRecord } from "@packages/domain/activity/activityRecord";
import type { TaskRecord } from "@packages/domain/task/taskRecord";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/useDailyPage";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivitiesIncludingDeleted } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { activityRepository } from "../../repositories/activityRepository";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";

type Activity =
  import("@packages/domain/activity/activityRecord").ActivityRecord & {
    _syncStatus: string;
  };
type ActivityKindWithSync = ActivityKindRecord & { _syncStatus: SyncStatus };
type TaskWithSync = TaskRecord & { _syncStatus: SyncStatus };

export const useDailyPage = createUseDailyPage<
  Activity,
  ActivityKindWithSync,
  TaskWithSync
>({
  react: { useState, useMemo, useCallback },
  useActivities: useActivitiesIncludingDeleted,
  useActivityLogsByDate,
  useTasksByDate: (date) =>
    useLiveQuery("tasks", () => taskRepository.getTasksByDate(date), [date]),
  useAllKinds: () =>
    useLiveQuery(
      "activity_kinds",
      () => activityRepository.getAllActivityKindsIncludingDeleted(),
      [],
    ),
  taskRepository,
  activityLogRepository,
  syncEngine,
});
