import { useState } from "react";

import { useForm } from "react-hook-form";

import type { GetActivityResponse } from "@dtos/response";

import { createUseCreateGoal } from "../";

type FormData = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

type UseNewGoalSlotDependencies = {
  apiClient: any;
  onCreated: () => void;
  onActivitySelected?: () => void;
};

export const createUseNewGoalSlot = (deps: UseNewGoalSlotDependencies) => {
  const { apiClient, onCreated, onActivitySelected } = deps;

  return (activities: GetActivityResponse[]) => {
    const createGoal = createUseCreateGoal({ apiClient });
    const [isCreating, setIsCreating] = useState(false);
    const form = useForm<FormData>({
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

    const handleSubmit = (data: FormData) => {
      const quantity = data.dailyTargetQuantity;
      if (!quantity || quantity <= 0) {
        return;
      }

      createGoal.mutate(
        {
          activityId: data.activityId,
          dailyTargetQuantity: Number(quantity),
          startDate: data.startDate,
          endDate: data.endDate || undefined,
        },
        {
          onSuccess: () => {
            setIsCreating(false);
            form.reset();
            onCreated();
          },
        },
      );
    };

    // 新規目標追加ボタンのクリックハンドラ
    const handleStartCreating = () => {
      setIsCreating(true);
    };

    // 活動選択時のハンドラ
    const handleActivityChange = (
      value: string,
      fieldOnChange: (value: string) => void,
    ) => {
      fieldOnChange(value);
      // プラットフォーム固有の処理をコールバックで実行
      onActivitySelected?.();
    };

    // 日次目標数量の変更ハンドラ
    const handleTargetQuantityChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      fieldOnChange: (value: string | number) => void,
    ) => {
      const value = e.target.value;
      fieldOnChange(value === "" ? "" : Number(value));
    };

    // キャンセルボタンのクリックハンドラ
    const handleCancel = () => {
      setIsCreating(false);
      form.reset();
    };

    return {
      // State
      isCreating,
      form,
      selectedActivity,
      quantityUnit,

      // Mutations
      createGoal,

      // Handlers
      handleSubmit,
      handleStartCreating,
      handleActivityChange,
      handleTargetQuantityChange,
      handleCancel,
    };
  };
};
