import { apiClient } from "@frontend/utils/apiClient";
import { createWebStorageAdapter } from "@packages/frontend-shared/adapters/web";
import { createUseNewGoalCard } from "@packages/frontend-shared/hooks/feature";

import type { GoalResponse } from "@dtos/response";

// Webアダプターのインスタンスを作成
const storage = createWebStorageAdapter();

export const useNewGoalCard = (
  goal: GoalResponse,
  onEditEnd: () => void,
  isPast = false,
) => {
  // 共通フックをインスタンス化（各呼び出しで新しいインスタンスを作成）
  const useNewGoalCardBase = createUseNewGoalCard({
    apiClient,
    storage,
    onEditEnd,
    // Web固有のconfirm実装
    onConfirm: async (message: string) => window.confirm(message),
  });

  return useNewGoalCardBase(goal, isPast);
};
