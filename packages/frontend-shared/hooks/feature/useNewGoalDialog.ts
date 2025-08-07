import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { GetActivityResponse } from "@dtos/response";

import { createUseCreateGoal } from "../";

const FormSchema = z.object({
  activityId: z.string().min(1, "活動を選択してください"),
  dailyTargetQuantity: z
    .number()
    .positive("日次目標は正の数を入力してください"),
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().optional(),
});

export type GoalFormData = z.infer<typeof FormSchema>;

type UseNewGoalDialogDependencies = {
  apiClient: any;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onSuccessMessage?: (title: string, description?: string) => void;
  onErrorMessage?: (title: string, description?: string) => void;
};

export const createUseNewGoalDialog = (deps: UseNewGoalDialogDependencies) => {
  const {
    apiClient,
    onOpenChange,
    onSuccess,
    onSuccessMessage,
    onErrorMessage,
  } = deps;

  return (activities: GetActivityResponse[]) => {
    const createGoal = createUseCreateGoal({ apiClient });
    const form = useForm<GoalFormData>({
      resolver: zodResolver(FormSchema),
      defaultValues: {
        dailyTargetQuantity: 1,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      },
    });

    // 選択された活動の単位を取得
    const selectedActivityId = form.watch("activityId");
    const selectedActivity = activities.find(
      (a) => a.id === selectedActivityId,
    );
    const quantityUnit = selectedActivity?.quantityUnit || "";

    const handleSubmit = (data: GoalFormData) => {
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
            onSuccessMessage?.(
              "目標を作成しました",
              "新しい目標が追加されました",
            );
            onSuccess?.();
          },
          onError: () => {
            onErrorMessage?.("エラー", "目標の作成に失敗しました");
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
      validationSchema: FormSchema,
    };
  };
};
