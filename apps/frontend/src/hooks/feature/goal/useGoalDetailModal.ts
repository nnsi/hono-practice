import { apiClient } from "@frontend/utils/apiClient";
import { createUseGoalDetailModal } from "@packages/frontend-shared/hooks/feature";

import type { GoalResponse } from "@dtos/response";

// 共通フックをインスタンス化
const useGoalDetailModalBase = createUseGoalDetailModal({ apiClient });

export const useGoalDetailModal = (goalId: string, goal: GoalResponse, open: boolean) => {
  return useGoalDetailModalBase(goalId, goal, open);
};
