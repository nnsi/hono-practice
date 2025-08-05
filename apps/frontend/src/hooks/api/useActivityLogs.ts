import { apiClient, qp } from "@frontend/utils";
import {
  createUseActivityLogs,
  createUseCreateActivityLog,
  createUseDeleteActivityLog,
  createUseUpdateActivityLog,
} from "@packages/frontend-shared/hooks/useActivityLogs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateActivityLogBatchRequest } from "@dtos/request";
import { GetActivityStatsResponseSchema } from "@dtos/response";

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
  return useQuery({
    ...qp({
      queryKey: ["activity-stats-monthly", month],
      queryFn: () =>
        apiClient.users["activity-logs"].stats.$get({
          query: {
            date: month,
          },
        }),
      schema: GetActivityStatsResponseSchema,
    }),
  });
}

/**
 * アクティビティログバッチインポート用のフック
 */
export function useBatchImportActivityLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityLogBatchRequest) => {
      const res = await apiClient.users["activity-logs"].batch.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to batch import activity logs");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
