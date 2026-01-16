import type { GoalResponse } from "@dtos/response";
import { apiClient } from "@frontend/utils/apiClient";
import { createUseGoalDetailModal } from "@packages/frontend-shared/hooks/feature";

// 共通フックをインスタンス化
const useGoalDetailModalBase = createUseGoalDetailModal({ apiClient });

export const useGoalDetailModal = (
  goalId: string,
  goal: GoalResponse,
  open: boolean,
) => {
  const { stateProps } = useGoalDetailModalBase(goalId, goal, open);

  // 後方互換性を維持
  return {
    ...stateProps,
    // 新しいグループ化されたAPIも公開
    stateProps,
  };
};
