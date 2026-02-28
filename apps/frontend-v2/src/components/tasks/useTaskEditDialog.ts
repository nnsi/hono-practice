import { useState } from "react";
import { createUseTaskEditDialog } from "@packages/frontend-shared/hooks/useTaskEditDialog";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { TaskItem } from "./types";

const useTaskEditDialogBase = createUseTaskEditDialog({
  react: { useState },
  taskRepository,
  syncEngine,
});

export function useTaskEditDialog(task: TaskItem, onSuccess: () => void) {
  const base = useTaskEditDialogBase(task, onSuccess);
  return {
    ...base,
    handleSubmit: async (e: React.FormEvent) => {
      e.preventDefault();
      return base.handleSubmit();
    },
  };
}
