import { apiClient } from "@frontend/utils/apiClient";
import { createUseNewGoalSlot } from "@packages/frontend-shared/hooks/feature";

import type { GetActivityResponse } from "@dtos/response";

export const useNewGoalSlot = (
  activities: GetActivityResponse[],
  onCreated: () => void,
) => {
  // 共通フックをインスタンス化
  const useNewGoalSlotBase = createUseNewGoalSlot({
    apiClient,
    onCreated,
    // Web固有のDOM操作
    onActivitySelected: () => {
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
    },
  });

  return useNewGoalSlotBase(activities);
};
