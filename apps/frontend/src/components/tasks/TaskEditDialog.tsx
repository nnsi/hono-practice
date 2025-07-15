import React from "react";

import { Button } from "@frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@frontend/components/ui/form";
import { Input } from "@frontend/components/ui/input";
import { Textarea } from "@frontend/components/ui/textarea";
import { toast } from "@frontend/components/ui/use-toast";
import { useUpdateTask } from "@frontend/hooks/sync/useSyncedTask";
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

type TaskEditDialogProps = {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  task,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const updateTask = useUpdateTask();

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

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>タスクを編集</DialogTitle>
          <DialogDescription>タスクの詳細情報を編集できます</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input placeholder="タスクのタイトル" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始日</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>期限日（任意）</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="タスクに関するメモ"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
