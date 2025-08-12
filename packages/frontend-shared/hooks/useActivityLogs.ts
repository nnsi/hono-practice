import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import type {
  CreateActivityLogBatchRequest,
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@dtos/request";
import {
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityStatsResponse,
  GetActivityStatsResponseSchema,
} from "@dtos/response";

import type { AppType } from "@backend/app";

export type UseActivityLogsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  date: Date;
  enabled?: boolean;
};

export function createUseActivityLogs(options: UseActivityLogsOptions) {
  const { apiClient, date, enabled = true } = options;
  const dateString = dayjs(date).format("YYYY-MM-DD");

  return useQuery<GetActivityLogsResponse>({
    queryKey: ["activity-logs-daily", dateString],
    queryFn: async () => {
      const res = await apiClient.users["activity-logs"].$get({
        query: { date: dateString },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch activity logs");
      }
      const json = await res.json();
      const parsed = GetActivityLogsResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse activity logs");
      }
      return parsed.data;
    },
    enabled,
  });
}

export type CreateActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseCreateActivityLog(options: CreateActivityLogOptions) {
  const { apiClient } = options;

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
    // onSuccessを削除 - invalidateはuseActivityRegistPageのhandleActivityLogCreateSuccessで一括処理
  });
}

export type UpdateActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseUpdateActivityLog(options: UpdateActivityLogOptions) {
  const { apiClient } = options;

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
    // onSuccessを削除 - invalidateは呼び出し元で一括処理
  });
}

export type DeleteActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseDeleteActivityLog(options: DeleteActivityLogOptions) {
  const { apiClient } = options;

  return useMutation({
    mutationFn: async ({ id, date: _date }: { id: string; date: string }) => {
      const res = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity log");
      }
    },
    // onSuccessを削除 - invalidateは呼び出し元で一括処理
  });
}

export type UseActivityStatsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  month: string;
};

/**
 * アクティビティ統計情報を取得する共通フック
 */
export function createUseActivityStatsApi(options: UseActivityStatsOptions) {
  const { apiClient, month } = options;

  return useQuery<GetActivityStatsResponse>({
    queryKey: ["activity-stats-monthly", month],
    queryFn: async () => {
      const res = await apiClient.users["activity-logs"].stats.$get({
        query: { date: month },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch activity stats");
      }
      const json = await res.json();
      const parsed = GetActivityStatsResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse activity stats");
      }
      return parsed.data;
    },
  });
}

export type UseBatchImportActivityLogsOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

/**
 * アクティビティログバッチインポート用の共通フック
 */
export function createUseBatchImportActivityLogs(
  options: UseBatchImportActivityLogsOptions,
) {
  const { apiClient } = options;

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
    // onSuccessを削除 - バッチインポート後のキャッシュ無効化は呼び出し元で管理
  });
}
