import { apiClient } from "@frontend/utils/apiClient";
import { createUseGoalDetailModal } from "@packages/frontend-shared/hooks/feature";

// 共通フックをインスタンス化
const useGoalDetailModalBase = createUseGoalDetailModal({ apiClient });

export const useGoalDetailModal = (goalId: string, open: boolean) => {
  return useGoalDetailModalBase(goalId, open);
};
