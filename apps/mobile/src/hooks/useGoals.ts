import {
  type GoalFilters,
  createUseCreateGoal,
  createUseDeleteGoal,
  createUseGoal,
  createUseGoalStats,
  createUseGoals,
  createUseUpdateGoal,
} from "@packages/frontend-shared/hooks";

import { apiClient } from "../utils/apiClient";

/**
 * Goals一覧を取得するフック
 */
export function useGoals(filters?: GoalFilters) {
  return createUseGoals({ apiClient, filters });
}

/**
 * 単一のGoalを取得するフック
 */
export function useGoal(id: string) {
  const result = createUseGoal({ apiClient, id });
  // Mobile版はundefinedを使用
  return {
    ...result,
    data: result.data === null ? undefined : result.data,
  };
}

/**
 * Goal作成用のフック
 */
export function useCreateGoal() {
  return createUseCreateGoal({ apiClient });
}

/**
 * Goal更新用のフック
 */
export function useUpdateGoal() {
  return createUseUpdateGoal({ apiClient });
}

/**
 * Goal削除用のフック
 */
export function useDeleteGoal() {
  return createUseDeleteGoal({ apiClient });
}

/**
 * Goal統計情報を取得するフック
 */
export function useGoalStats(id: string, enabled = true) {
  return createUseGoalStats({ apiClient, id, enabled });
}
