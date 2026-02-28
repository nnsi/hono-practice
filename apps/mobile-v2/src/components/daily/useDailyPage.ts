import { useState, useMemo, useCallback } from "react";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/useDailyPage";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useLiveQuery } from "../../db/useLiveQuery";
import { activityRepository } from "../../repositories/activityRepository";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { ActivityKindRecord } from "@packages/domain/activity/activityRecord";
import type { SyncStatus } from "@packages/domain";

type Activity = import("@packages/domain/activity/activityRecord").ActivityRecord & {
  _syncStatus: string;
};
type ActivityKindWithSync = ActivityKindRecord & { _syncStatus: SyncStatus };

export const useDailyPage = createUseDailyPage<Activity, ActivityKindWithSync>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useTasksByDate: (date) =>
    useLiveQuery("tasks", () => taskRepository.getTasksByDate(date), [date]),
  useAllKinds: () =>
    useLiveQuery(
      "activity_kinds",
      () => activityRepository.getAllActivityKinds(),
      [],
    ),
  taskRepository,
  syncEngine,
});
