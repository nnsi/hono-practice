import { createUseActivities } from "@packages/frontend-shared/hooks";

import { apiClient } from "../utils/apiClient";

/**
 * 全アクティビティ一覧と、日付が指定された場合はその日のアクティビティログを取得するフック
 *
 * 共通化されたcreateUseActivitiesを使用
 */
export const useActivities = (date?: Date) => {
  return createUseActivities({ apiClient, date });
};
