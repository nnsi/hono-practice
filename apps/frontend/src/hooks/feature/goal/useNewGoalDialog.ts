import { useCreateGoal } from "@frontend/hooks/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { GetActivityResponse } from "@dtos/response";

import { useToast } from "@components/ui";

const FormSchema = z.object({
  activityId: z.string().min(1, "活動を選択してください"),
  dailyTargetQuantity: z
    .number()
    .positive("日次目標は正の数を入力してください"),
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

export const useNewGoalDialog = (
  onOpenChange: (open: boolean) => void,
  activities: GetActivityResponse[],
  onSuccess?: () => void,
) => {
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

  return {
    form,
    createGoal,
    selectedActivity,
    quantityUnit,
    handleSubmit,
  };
};
