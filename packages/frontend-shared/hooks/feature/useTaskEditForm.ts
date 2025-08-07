import { z } from "zod";

import { createUseDeleteTask, createUseUpdateTask } from "..";

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

// バリデーションスキーマ（共通）
export const updateTaskSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
});

export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;

type UseTaskEditFormOptions = {
  apiClient: any; // APIクライアントの型は各プラットフォームで定義
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export const createUseTaskEditForm = (options: UseTaskEditFormOptions) => {
  return (task: TaskItem | null) => {
    const { apiClient, onSuccess, onError } = options;

    const updateTask = createUseUpdateTask({ apiClient });
    const deleteTask = createUseDeleteTask({ apiClient });

    // フォームの初期値を生成
    const getInitialValues = (): UpdateTaskFormData => {
      if (!task) {
        return {
          title: "",
          startDate: "",
          dueDate: "",
          memo: "",
        };
      }

      return {
        title: task.title,
        startDate: task.startDate ?? "",
        dueDate: task.dueDate ?? "",
        memo: task.memo ?? "",
      };
    };

    // タスクを更新
    const handleUpdateTask = async (data: UpdateTaskFormData) => {
      if (!task) return;

      try {
        await updateTask.mutateAsync({
          id: task.id,
          data: {
            title: data.title,
            startDate: data.startDate,
            dueDate: data.dueDate || null,
            memo: data.memo || undefined,
          },
        });
        onSuccess?.();
      } catch (error) {
        console.error("Failed to update task:", error);
        onError?.(error as Error);
      }
    };

    // タスクを削除
    const handleDeleteTask = async () => {
      if (!task) return;

      try {
        await deleteTask.mutateAsync(task.id);
        onSuccess?.();
      } catch (error) {
        console.error("Failed to delete task:", error);
        onError?.(error as Error);
      }
    };

    return {
      // Data
      task,
      initialValues: getInitialValues(),

      // Actions
      handleUpdateTask,
      handleDeleteTask,

      // Mutations
      updateTask,
      deleteTask,
      isUpdating: updateTask.isPending,
      isDeleting: deleteTask.isPending,

      // Validation
      validationSchema: updateTaskSchema,
    };
  };
};
