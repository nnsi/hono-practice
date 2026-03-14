import dayjs from "dayjs";

import type { ReactHooks } from "./types";

type UseTaskCreateDialogDeps = {
  react: Pick<ReactHooks, "useState">;
  taskRepository: {
    createTask: (data: {
      title: string;
      activityId: string | null;
      activityKindId: string | null;
      quantity: number | null;
      startDate: string | null;
      dueDate: string | null;
      memo: string;
    }) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => void };
};

export function createUseTaskCreateDialog(deps: UseTaskCreateDialogDeps) {
  const {
    react: { useState },
    taskRepository,
    syncEngine,
  } = deps;

  return function useTaskCreateDialog(
    onSuccess: () => void,
    defaultDate?: string,
  ) {
    const [title, setTitle] = useState("");
    const [activityId, setActivityId] = useState<string | null>(null);
    const [activityKindId, setActivityKindId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<number | null>(null);
    const [startDate, setStartDate] = useState(
      defaultDate ?? dayjs().format("YYYY-MM-DD"),
    );
    const [dueDate, setDueDate] = useState("");
    const [memo, setMemo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!title.trim()) return;

      setIsSubmitting(true);
      await taskRepository.createTask({
        title: title.trim(),
        activityId,
        activityKindId,
        quantity,
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
      activityId,
      setActivityId,
      activityKindId,
      setActivityKindId,
      quantity,
      setQuantity,
      startDate,
      setStartDate,
      dueDate,
      setDueDate,
      memo,
      setMemo,
      isSubmitting,
      handleSubmit,
    };
  };
}
