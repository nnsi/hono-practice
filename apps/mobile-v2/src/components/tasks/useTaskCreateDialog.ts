import { useState } from "react";
import dayjs from "dayjs";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";

export function useTaskCreateDialog(
  onSuccess: () => void,
  defaultDate?: string,
) {
  // state
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(
    defaultDate ?? dayjs().format("YYYY-MM-DD"),
  );
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // handlers
  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    await taskRepository.createTask({
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
    // form state
    title,
    setTitle,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    memo,
    setMemo,
    isSubmitting,
    // handlers
    handleCreate,
  };
}
