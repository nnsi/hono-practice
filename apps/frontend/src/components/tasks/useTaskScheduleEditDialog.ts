import { useState } from "react";

import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { createUseTaskScheduleEditDialog } from "@packages/frontend-shared/hooks/useTaskScheduleEditDialog";

import { taskScheduleRepository } from "../../db/taskScheduleRepository";
import { syncEngine } from "../../sync/syncEngine";

const useTaskScheduleEditDialogBase = createUseTaskScheduleEditDialog({
  react: { useState },
  taskScheduleRepository,
  syncEngine,
});

export function useTaskScheduleEditDialog(
  schedule: TaskScheduleRecord,
  onSuccess: () => void,
) {
  const base = useTaskScheduleEditDialogBase(schedule, onSuccess);
  return {
    ...base,
    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSubmit();
    },
  };
}
