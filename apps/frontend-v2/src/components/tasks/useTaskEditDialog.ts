import { useState } from "react";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { TaskItem } from "./types";

export function useTaskEditDialog(task: TaskItem, onSuccess: () => void) {
  // state
  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.startDate || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [memo, setMemo] = useState(task.memo || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // computed
  const isArchived = !!task.archivedAt;

  // handlers
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    isArchived,
    // handlers
    handleSubmit,
  };
}
