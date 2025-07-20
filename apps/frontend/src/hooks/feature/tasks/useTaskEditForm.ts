import React from "react";

import { toast } from "@frontend/components/ui/use-toast";
import {
  useDeleteTask,
  useUpdateTask,
} from "@frontend/hooks/sync/useSyncedTask";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

const updateTaskSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  startDate: z.string().min(1, "開始日は必須です"),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
});

type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;

export const useTaskEditForm = (
  task: TaskItem | null,
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const form = useForm<UpdateTaskFormData>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title: "",
      startDate: "",
      dueDate: "",
      memo: "",
    },
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
  }, [task, form]);

  const onSubmit = async (data: UpdateTaskFormData) => {
    if (!task) return;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate || null,
        memo: data.memo || undefined,
      });
      toast({
        title: "タスクを更新しました",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        variant: "destructive",
        title: "タスクの更新に失敗しました",
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    try {
      await deleteTask.mutateAsync({ id: task.id });
      toast({
        title: "タスクを削除しました",
      });
      setShowDeleteDialog(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        variant: "destructive",
        title: "タスクの削除に失敗しました",
      });
    }
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
