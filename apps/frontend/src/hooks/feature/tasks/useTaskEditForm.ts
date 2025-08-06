import React from "react";

import { toast } from "@frontend/components/ui/use-toast";
import { apiClient } from "@frontend/utils/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UpdateTaskFormData,
  createUseTaskEditForm,
} from "@packages/frontend-shared/hooks/feature";
import { useForm } from "react-hook-form";

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

// 共通フックをインスタンス化
const useTaskEditFormBase = createUseTaskEditForm({
  apiClient,
  onSuccess: () => {
    toast({
      title: "タスクを更新しました",
    });
  },
  onError: (error) => {
    toast({
      variant: "destructive",
      title: "操作に失敗しました",
      description: error.message,
    });
  },
});

export const useTaskEditForm = (
  task: TaskItem | null,
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const {
    initialValues,
    handleUpdateTask,
    handleDeleteTask,
    updateTask,
    deleteTask,
    validationSchema,
  } = useTaskEditFormBase(task);

  const form = useForm<UpdateTaskFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
  });

  // タスクが変更されたらフォームの値を更新
  React.useEffect(() => {
    if (task) {
      form.reset(initialValues);
    }
  }, [task, form, initialValues]);

  const onSubmit = async (data: UpdateTaskFormData) => {
    await handleUpdateTask(data);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    await handleDeleteTask();
    setShowDeleteDialog(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return {
    form,
    showDeleteDialog,
    setShowDeleteDialog,
    onSubmit,
    handleDelete,
    updateTask,
    deleteTask,
  };
};
