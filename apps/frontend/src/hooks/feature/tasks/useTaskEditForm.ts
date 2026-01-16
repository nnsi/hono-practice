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

  const { stateProps, actions, validationSchema } = useTaskEditFormBase(task);

  const form = useForm<UpdateTaskFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: stateProps.initialValues,
  });

  // タスクが変更されたらフォームの値を更新
  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        startDate: task.startDate ?? "",
        dueDate: task.dueDate ?? "",
        memo: task.memo ?? "",
      });
    }
  }, [task?.id, task?.title, task?.startDate, task?.dueDate, task?.memo, form]);

  const onSubmit = async (data: UpdateTaskFormData) => {
    await actions.onUpdateTask(data);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleDelete = async () => {
    await actions.onDeleteTask();
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
    // 後方互換性のためにupdateTask/deleteTaskをシミュレート
    updateTask: { isPending: stateProps.isUpdating },
    deleteTask: { isPending: stateProps.isDeleting },
  };
};
