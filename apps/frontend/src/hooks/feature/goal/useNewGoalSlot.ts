import type { GetActivityResponse } from "@dtos/response";
import { apiClient } from "@frontend/utils/apiClient";
import { createUseNewGoalSlot } from "@packages/frontend-shared/hooks/feature";

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

  const { stateProps, actions, form } = useNewGoalSlotBase(activities);

  // 後方互換性を維持しながら新しいAPIも公開
  return {
    ...stateProps,
    form,
    // 旧API互換のアクション
    handleSubmit: actions.onSubmit,
    handleStartCreating: actions.onStartCreating,
    handleActivityChange: actions.onActivityChange,
    handleTargetQuantityChange: actions.onTargetQuantityChange,
    handleCancel: actions.onCancel,
    // コンポーネント互換性のためにcreateGoalをシミュレート
    createGoal: { isPending: stateProps.isPending },
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
