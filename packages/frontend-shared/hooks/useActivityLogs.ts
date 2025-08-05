import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type {
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@dtos/request";
import {
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
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

export type UpdateActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseUpdateActivityLog(options: UpdateActivityLogOptions) {
  const { apiClient } = options;
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

export type DeleteActivityLogOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
};

export function createUseDeleteActivityLog(options: DeleteActivityLogOptions) {
  const { apiClient } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, date: _date }: { id: string; date: string }) => {
      const res = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to delete activity log");
      }
    },
    onSuccess: (_data, variables) => {
      // 関連するクエリを無効化
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", variables.date],
      });
    },
  });
}
