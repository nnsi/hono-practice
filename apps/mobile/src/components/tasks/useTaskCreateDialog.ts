import { useState } from "react";

import { createUseTaskCreateDialog } from "@packages/frontend-shared/hooks/useTaskCreateDialog";

import { taskRepository } from "../../repositories/taskRepository";
import { taskScheduleRepository } from "../../repositories/taskScheduleRepository";
import { syncEngine } from "../../sync/syncEngine";

const useTaskCreateDialogBase = createUseTaskCreateDialog({
  react: { useState },
  taskRepository,
  taskScheduleRepository,
  syncEngine,
});

export function useTaskCreateDialog(
  onSuccess: () => void,
  defaultDate?: string,
) {
  const base = useTaskCreateDialogBase(onSuccess, defaultDate);
  return { ...base, handleCreate: base.handleSubmit };
}
