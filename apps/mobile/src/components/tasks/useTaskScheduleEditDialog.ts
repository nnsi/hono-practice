import { useState } from "react";

import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { createUseTaskScheduleEditDialog } from "@packages/frontend-shared/hooks/useTaskScheduleEditDialog";

import { taskScheduleRepository } from "../../repositories/taskScheduleRepository";
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
  return { ...base, handleSave: base.handleSubmit };
}
