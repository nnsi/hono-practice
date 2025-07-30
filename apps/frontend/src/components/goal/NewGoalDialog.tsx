import { useCreateGoal } from "@frontend/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { GetActivityResponse } from "@dtos/response";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@components/ui";

import { ActivityIcon } from "../common/ActivityIcon";

const FormSchema = z.object({
  activityId: z.string().min(1, "活動を選択してください"),
  dailyTargetQuantity: z
    .number()
    .positive("日次目標は正の数を入力してください"),
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

type NewGoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: GetActivityResponse[];
  onSuccess?: () => void;
};

export const NewGoalDialog: React.FC<NewGoalDialogProps> = ({
  open,
  onOpenChange,
  activities,
  onSuccess,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dailyTargetQuantity: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const { toast } = useToast();
  const createGoal = useCreateGoal();

  // 選択された活動の単位を取得
  const selectedActivityId = form.watch("activityId");
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const quantityUnit = selectedActivity?.quantityUnit || "";

  const handleSubmit = (data: FormData) => {
    createGoal.mutate(
      {
        activityId: data.activityId,
        dailyTargetQuantity: data.dailyTargetQuantity,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
          toast({
            title: "目標を作成しました",
            description: "新しい目標が追加されました",
          });
          onSuccess?.();
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "目標の作成に失敗しました",
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
          <DialogTitle>新しい目標を作成</DialogTitle>
          <DialogDescription>
            アクティビティと日次目標を設定してください
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="activityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>アクティビティ</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="活動を選択">
                          {selectedActivity && (
                            <div className="flex items-center gap-2">
                              <ActivityIcon activity={selectedActivity} size="small" />
                              <span>{selectedActivity.name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          <div className="flex items-center gap-2">
                            <ActivityIcon activity={activity} size="small" />
                            <span>{activity.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dailyTargetQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    日次目標
                    {quantityUnit && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({quantityUnit})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>終了日（任意）</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={createGoal.isPending}>
                作成
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
