import { useEffect } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Textarea,
  useToast,
} from "@components/ui";
import { useCreateTask } from "@frontend/hooks/api/useTasks";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  startDate: z.string().min(1, "開始日を入力してください"),
  dueDate: z.string().optional(),
  memo: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  onSuccess?: () => void;
};

export const TaskCreateDialog: React.FC<TaskCreateDialogProps> = ({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      startDate: dayjs(defaultDate || new Date()).format("YYYY-MM-DD"),
      dueDate: "",
      memo: "",
    },
  });

  const { toast } = useToast();
  const createTask = useCreateTask();

  // ダイアログが開かれるたびに、またはdefaultDateが変更されたときにフォームの開始日を更新
  useEffect(() => {
    if (open && defaultDate) {
      form.setValue("startDate", dayjs(defaultDate).format("YYYY-MM-DD"));
    }
  }, [open, defaultDate, form]);

  const handleSubmit = (data: FormData) => {
    createTask.mutate(
      {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate || undefined,
        memo: data.memo || undefined,
      },
      {
        onSuccess: () => {
          form.reset({
            title: "",
            startDate: dayjs(defaultDate || new Date()).format("YYYY-MM-DD"),
            dueDate: "",
            memo: "",
          });
          onOpenChange(false);
          toast({
            title: "タスクを作成しました",
            description: "新しいタスクが追加されました",
          });
          onSuccess?.();
        },
        onError: (error) => {
          console.error("Task creation error:", error);
          toast({
            title: "エラー",
            description:
              error instanceof Error
                ? error.message
                : "タスクの作成に失敗しました",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新しいタスクを作成</DialogTitle>
          <DialogDescription>タスクの詳細を入力してください</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="タスクのタイトルを入力"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>開始日</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>期限（任意）</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メモ（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="タスクに関するメモを入力"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                作成
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
