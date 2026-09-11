import type { TaskItem } from "@packages/domain/task/types";

import {
  type MaterializeTaskRepository,
  isVirtualScheduledTask,
  materializeScheduledTask,
} from "./materializeScheduledTask";
import type { ReactHooks } from "./types";
import { isValidTaskTitle } from "./useTaskCreateDialog";

type TaskEditFields = {
  title: string;
  activityId: string | null;
  activityKindId: string | null;
  quantity: number | null;
  startDate: string | null;
  dueDate: string | null;
  memo: string;
};

type UseTaskEditDialogDeps = {
  react: Pick<ReactHooks, "useState">;
  /** 仮想タスク（スケジュール由来）は保存時に `materializeScheduledTask` で実 Task 行を確保してから更新する */
  taskRepository: MaterializeTaskRepository & {
    updateTask: (id: string, data: TaskEditFields) => Promise<unknown>;
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
    const [activityId, setActivityId] = useState<string | null>(
      task.activityId,
    );
    const [activityKindId, setActivityKindId] = useState<string | null>(
      task.activityKindId,
    );
    const [quantity, setQuantity] = useState<number | null>(task.quantity);
    const [startDate, setStartDate] = useState(task.startDate || "");
    const [dueDate, setDueDate] = useState(task.dueDate || "");
    const [memo, setMemo] = useState(task.memo || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isArchived = !!task.archivedAt;

    /**
     * 仮想タスクは保存時に初めて実 Task 行になる（起動・キャンセルでは永続化しない）。
     * 同 id の行が既にある（他端末が実体化して pull で届いた / submit 二重発火）場合も
     * `materializeScheduledTask` が既存行を再利用するので、insert の一意制約で落ちない。
     */
    const persist = async (fields: TaskEditFields) => {
      const target = isVirtualScheduledTask(task)
        ? await materializeScheduledTask(taskRepository, task)
        : task;
      await taskRepository.updateTask(target.id, fields);
    };

    const handleSubmit = async () => {
      if (!isValidTaskTitle(title)) return;

      setIsSubmitting(true);
      try {
        await persist({
          title: title.trim(),
          activityId,
          activityKindId,
          quantity,
          startDate: startDate || null,
          dueDate: dueDate || null,
          memo: memo.trim(),
        });
      } finally {
        setIsSubmitting(false);
      }
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
      isArchived,
      handleSubmit,
    };
  };
}
