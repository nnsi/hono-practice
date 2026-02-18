import type { AppType } from "@backend/app";
import type {
  CreateActivityLogBatchRequest,
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@dtos/request";
import type { GetActivitiesResponse } from "@dtos/response";
import {
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityStatsResponse,
  GetActivityStatsResponseSchema,
} from "@dtos/response";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { buildOptimisticActivityLog } from "../utils/optimisticData";

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-activity-log"],
    mutationFn: async (data: CreateActivityLogRequest) => {
      const res = await apiClient.users["activity-logs"].$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to create activity log");
      }
      return res.json();
    },
    onMutate: async (newLog) => {
      const dateKey = newLog.date;
      await queryClient.cancelQueries({
        queryKey: ["activity-logs-daily", dateKey],
      });
      const previousLogs = queryClient.getQueryData<GetActivityLogsResponse>([
        "activity-logs-daily",
        dateKey,
      ]);
      // ["activity"]キーにはオブジェクト{ activities, activityLogs }が格納されている
      const cachedData = queryClient.getQueryData<{
        activities: GetActivitiesResponse;
      }>(["activity"]);
      const activities = cachedData?.activities ?? [];
      const optimisticLog = buildOptimisticActivityLog(newLog, activities);
      queryClient.setQueryData<GetActivityLogsResponse>(
        ["activity-logs-daily", dateKey],
        (old) => [...(old ?? []), optimisticLog],
      );
      return { previousLogs, dateKey };
    },
    onError: (_err, _newLog, context) => {
      if (context?.dateKey && context?.previousLogs) {
        queryClient.setQueryData(
          ["activity-logs-daily", context.dateKey],
          context.previousLogs,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-stats-monthly"],
      });
    },
  });
}

export type UpdateActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseUpdateActivityLog(options: UpdateActivityLogOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-activity-log"],
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
    onMutate: async (variables) => {
      const dateKey = variables.date;
      await queryClient.cancelQueries({
        queryKey: ["activity-logs-daily", dateKey],
      });
      const previousLogs = queryClient.getQueryData<GetActivityLogsResponse>([
        "activity-logs-daily",
        dateKey,
      ]);
      queryClient.setQueryData<GetActivityLogsResponse>(
        ["activity-logs-daily", dateKey],
        (old) =>
          (old ?? []).map((log) =>
            log.id === variables.id
              ? {
                  ...log,
                  ...variables.data,
                  updatedAt: new Date(),
                  _isOptimistic: true as const,
                }
              : log,
          ),
      );
      return { previousLogs, dateKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.dateKey && context?.previousLogs) {
        queryClient.setQueryData(
          ["activity-logs-daily", context.dateKey],
          context.previousLogs,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-stats-monthly"],
      });
    },
  });
}

export type DeleteActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseDeleteActivityLog(options: DeleteActivityLogOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-activity-log"],
    mutationFn: async ({ id, date: _date }: { id: string; date: string }) => {
      const res = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity log");
      }
    },
    onMutate: async (variables) => {
      const dateKey = variables.date;
      await queryClient.cancelQueries({
        queryKey: ["activity-logs-daily", dateKey],
      });
      const previousLogs = queryClient.getQueryData<GetActivityLogsResponse>([
        "activity-logs-daily",
        dateKey,
      ]);
      queryClient.setQueryData<GetActivityLogsResponse>(
        ["activity-logs-daily", dateKey],
        (old) => (old ?? []).filter((log) => log.id !== variables.id),
      );
      return { previousLogs, dateKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.dateKey && context?.previousLogs) {
        queryClient.setQueryData(
          ["activity-logs-daily", context.dateKey],
          context.previousLogs,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-stats-monthly"],
      });
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["batch-import-activity-logs"],
    mutationFn: async (data: CreateActivityLogBatchRequest) => {
      const res = await apiClient.users["activity-logs"].batch.$post({
        json: data,
      });
      if (!res.ok) {
        throw new Error("Failed to batch import activity logs");
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily"],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-stats-monthly"],
      });
    },
  });
}
