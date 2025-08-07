import { useState } from "react";

import dayjs from "dayjs";

import { createUseDeleteTask, createUseUpdateTask } from "..";

type TaskItem = {
  id: string;
  doneDate: string | null;
  [key: string]: any; // その他のプロパティ
};

type UseDailyTaskActionsOptions = {
  apiClient: any; // APIクライアントの型は各プラットフォームで定義
  onToggleTaskDone?: (task: TaskItem) => void;
  onDeleteTask?: (task: TaskItem) => void;
};

export const createUseDailyTaskActions = (
  options: UseDailyTaskActionsOptions,
) => {
  return (date: Date) => {
    const { apiClient, onToggleTaskDone, onDeleteTask } = options;
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const dateStr = dayjs(date).format("YYYY-MM-DD");

    const updateTask = createUseUpdateTask({ apiClient });
    const deleteTask = createUseDeleteTask({ apiClient });

    // タスクの完了/未完了を切り替えるハンドラ
    const handleToggleTaskDone = (task: TaskItem) => {
      const updatedTask = {
        ...task,
        doneDate: task.doneDate ? null : dateStr,
      };

      updateTask.mutate({
        id: task.id,
        data: {
          doneDate: updatedTask.doneDate,
        },
      });

      onToggleTaskDone?.(updatedTask);
    };

    // タスクを削除するハンドラ（プラットフォーム非依存版）
    const handleDeleteTask = (task: TaskItem) => {
      deleteTask.mutate(task.id);
      onDeleteTask?.(task);
    };

    return {
      // Dialog states (プラットフォーム固有)
      createDialogOpen,
      setCreateDialogOpen,

      // Mutations (Web側の互換性のため公開)
      updateTask,
      deleteTask,

      // Actions
      handleToggleTaskDone,
      handleDeleteTask,
    };
  };
};
