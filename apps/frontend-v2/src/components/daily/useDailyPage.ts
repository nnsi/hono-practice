import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/useDailyPage";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useTasksByDate } from "../../hooks/useTasks";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { db } from "../../db/schema";
import type { DexieActivity, DexieActivityKind } from "../../db/schema";

export const useDailyPage = createUseDailyPage<DexieActivity, DexieActivityKind>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useTasksByDate: (date) => {
    const { tasks } = useTasksByDate(date);
    return tasks;
  },
  useAllKinds: () =>
    useLiveQuery(
      () => db.activityKinds.filter((k) => !k.deletedAt).toArray(),
      [],
    ),
  taskRepository,
  syncEngine,
});
