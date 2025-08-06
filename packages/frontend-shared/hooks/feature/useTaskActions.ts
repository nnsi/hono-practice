import { useState } from "react";

import dayjs from "dayjs";

import {
  createUseArchiveTask,
  createUseDeleteTask,
  createUseUpdateTask,
} from "..";

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

type UseTaskActionsOptions = {
  apiClient: any; // APIクライアントの型は各プラットフォームで定義
  onToggleTaskDone?: (task: TaskItem) => void;
  onDeleteTask?: (task: TaskItem) => void;
  onArchiveTask?: (task: TaskItem) => void;
};

export const createUseTaskActions = (options: UseTaskActionsOptions) => {
  return () => {
    const { apiClient, onToggleTaskDone, onDeleteTask, onArchiveTask } =
      options;
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

    const updateTask = createUseUpdateTask({ apiClient });
    const deleteTask = createUseDeleteTask({ apiClient });
    const archiveTask = createUseArchiveTask({ apiClient });

    // タスクの完了/未完了を切り替えるハンドラ
    const handleToggleTaskDone = (task: TaskItem) => {
      const updatedTask = {
        ...task,
        doneDate: task.doneDate ? null : dayjs().format("YYYY-MM-DD"),
      };

      updateTask.mutate({
        id: task.id,
        data: {
          doneDate: updatedTask.doneDate,
        },
      });

      onToggleTaskDone?.(updatedTask);
    };

    // タスクを削除するハンドラ
    const handleDeleteTask = (task: TaskItem) => {
      deleteTask.mutate(task.id);
      onDeleteTask?.(task);
    };

    // タスクをアーカイブするハンドラ
    const handleArchiveTask = (task: TaskItem) => {
      archiveTask.mutate({
        id: task.id,
        date: task.startDate || undefined,
      });
      onArchiveTask?.(task);
    };

    // タスク選択
    const handleSelectTask = (task: TaskItem | null) => {
      setSelectedTask(task);
    };

    // 日付のフォーマット
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return null;
      return dayjs(dateStr).format("MM/DD");
    };

    return {
      // State
      selectedTask,

      // Actions
      handleToggleTaskDone,
      handleDeleteTask,
      handleArchiveTask,
      handleSelectTask,

      // Utilities
      formatDate,

      // Mutation states
      updateTaskPending: updateTask.isPending,
      deleteTaskPending: deleteTask.isPending,
      archiveTaskPending: archiveTask.isPending,
    };
  };
};
