import { useState } from "react";
import { createUseTaskCreateDialog } from "@packages/frontend-shared/hooks/useTaskCreateDialog";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";

const useTaskCreateDialogBase = createUseTaskCreateDialog({
  react: { useState },
  taskRepository,
  syncEngine,
});

export function useTaskCreateDialog(
  onSuccess: () => void,
  defaultDate?: string,
) {
  const base = useTaskCreateDialogBase(onSuccess, defaultDate);
  return {
    ...base,
    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSubmit();
    },
  };
}
