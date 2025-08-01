import { useState } from "react";

import { useCreateGoal } from "@frontend/hooks/api";
import { useForm } from "react-hook-form";

import type { GetActivityResponse } from "@dtos/response";

type FormData = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

export const useNewGoalSlot = (
  activities: GetActivityResponse[],
  onCreated: () => void,
) => {
  const [isCreating, setIsCreating] = useState(false);
  const form = useForm<FormData>({
    defaultValues: {
      dailyTargetQuantity: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const createGoal = useCreateGoal();

  // 選択された活動の単位を取得
  const selectedActivityId = form.watch("activityId");
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
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
    // 活動選択後、日次目標の入力欄にフォーカス
    setTimeout(() => {
      const targetInput = document.querySelector(
        'input[name="dailyTargetQuantity"]',
      ) as HTMLInputElement;
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }, 0);
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
