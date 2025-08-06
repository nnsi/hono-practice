import { apiClient } from "@frontend/utils";
import {
  createUseActivityLogs,
  createUseActivityStatsApi,
  createUseBatchImportActivityLogs,
  createUseCreateActivityLog,
  createUseDeleteActivityLog,
  createUseUpdateActivityLog,
} from "@packages/frontend-shared/hooks/useActivityLogs";

/**
 * 特定日のアクティビティログ一覧を取得するフック
 */
export function useActivityLogs(date: Date, options?: { enabled?: boolean }) {
  return createUseActivityLogs({
    apiClient,
    date,
    enabled: options?.enabled,
  });
}

/**
 * アクティビティログ作成用のフック
 */
export function useCreateActivityLog() {
  return createUseCreateActivityLog({ apiClient });
}

/**
 * アクティビティログ更新用のフック
 */
export function useUpdateActivityLog() {
  return createUseUpdateActivityLog({ apiClient });
}

/**
 * アクティビティログ削除用のフック
 */
export function useDeleteActivityLog() {
  return createUseDeleteActivityLog({ apiClient });
}

/**
 * アクティビティ統計情報を取得するフック
 */
export function useActivityStatsApi(month: string) {
  return createUseActivityStatsApi({ apiClient, month });
}

/**
 * アクティビティログバッチインポート用のフック
 */
export function useBatchImportActivityLogs() {
  return createUseBatchImportActivityLogs({ apiClient });
}
