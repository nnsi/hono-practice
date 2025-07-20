import { useState } from "react";

import {
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import dayjs from "dayjs";

import type { GetTaskResponse } from "@dtos/response/GetTasksResponse";

export const useDailyTaskActions = (date: Date) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const dateStr = dayjs(date).format("YYYY-MM-DD");

  // 同期対応のフックを使用
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // タスクの完了/未完了を切り替えるハンドラ
  const handleToggleTaskDone = (task: GetTaskResponse) => {
    updateTask.mutate({
      id: task.id,
      doneDate: task.doneDate ? null : dateStr,
      date: dateStr,
    });
  };

  // タスクを削除するハンドラ
  const handleDeleteTask = (e: React.MouseEvent, task: GetTaskResponse) => {
    e.stopPropagation();
    deleteTask.mutate({ id: task.id, date: dateStr });
  };

  return {
    createDialogOpen,
    setCreateDialogOpen,
    updateTask,
    deleteTask,
    handleToggleTaskDone,
    handleDeleteTask,
  };
};
