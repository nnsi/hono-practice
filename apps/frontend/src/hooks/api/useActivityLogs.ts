import { apiClient, qp } from "@frontend/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateActivityLogBatchRequest,
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@dtos/request";
import {
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  GetActivityStatsResponseSchema,
} from "@dtos/response";

/**
 * 特定日のアクティビティログ一覧を取得するフック
 */
export function useActivityLogs(date: Date, options?: { enabled?: boolean }) {
  const dateString = date.toISOString().split("T")[0];

  return useQuery<GetActivityLogsResponse>({
    ...qp({
      queryKey: ["activity-logs-daily", dateString],
      queryFn: () =>
        apiClient.users["activity-logs"].$get({
          query: { date: dateString },
        }),
      schema: GetActivityLogsResponseSchema,
    }),
    enabled: options?.enabled ?? true,
  });
}

/**
 * アクティビティログ作成用のフック
 */
export function useCreateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityLogRequest) => {
      const res = await apiClient.users["activity-logs"].$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to create activity log");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
    },
  });
}

/**
 * アクティビティログ更新用のフック
 */
export function useUpdateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
      date: _date,
    }: {
      id: string;
      data: UpdateActivityLogRequest;
      date: string;
    }) => {
      const res = await apiClient.users["activity-logs"][":id"].$put({
        param: { id },
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to update activity log");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
    },
  });
}

/**
 * アクティビティログ削除用のフック
 */
export function useDeleteActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, date: _date }: { id: string; date: string }) => {
      const res = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity log");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
    },
  });
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
