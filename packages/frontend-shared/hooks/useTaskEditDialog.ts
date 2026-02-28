import type { TaskItem } from "@packages/domain/task/types";

import type { ReactHooks } from "./types";

type UseTaskEditDialogDeps = {
  react: Pick<ReactHooks, "useState">;
  taskRepository: {
    updateTask: (
      id: string,
      data: {
        title: string;
        startDate: string | null;
        dueDate: string | null;
        memo: string;
      },
    ) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => void };
};

export function createUseTaskEditDialog(deps: UseTaskEditDialogDeps) {
  const {
    react: { useState },
    taskRepository,
    syncEngine,
  } = deps;

  return function useTaskEditDialog(task: TaskItem, onSuccess: () => void) {
    const [title, setTitle] = useState(task.title);
    const [startDate, setStartDate] = useState(task.startDate || "");
    const [dueDate, setDueDate] = useState(task.dueDate || "");
    const [memo, setMemo] = useState(task.memo || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isArchived = !!task.archivedAt;

    const handleSubmit = async () => {
      if (!title.trim()) return;

      setIsSubmitting(true);
      await taskRepository.updateTask(task.id, {
        title: title.trim(),
        startDate: startDate || null,
        dueDate: dueDate || null,
        memo: memo.trim(),
      });
      setIsSubmitting(false);
      syncEngine.syncTasks();
      onSuccess();
    };

    return {
      title,
      setTitle,
      startDate,
      setStartDate,
      dueDate,
      setDueDate,
      memo,
      setMemo,
      isSubmitting,
      isArchived,
      handleSubmit,
    };
  };
}
