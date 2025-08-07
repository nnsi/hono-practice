import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import type { AppType } from "@backend/app";

export type UseActivityBatchDataOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  date: Date;
};

export function createUseActivityBatchData(
  options: UseActivityBatchDataOptions,
) {
  const { apiClient, date } = options;
  const queryClient = useQueryClient();

  const { data, error } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: [
      "activity",
      "activity-logs-daily",
      dayjs(date).format("YYYY-MM-DD"),
    ],
    networkMode: "offlineFirst",
    enabled: true, // オフラインでもキャッシュデータを読み取れるようにする
    queryFn: async () => {
      const res = await apiClient.batch.$post({
        json: [
          {
            path: "/users/activities",
          },
          {
            path: `/users/activity-logs?date=${dayjs(date).format("YYYY-MM-DD")}`,
          },
        ],
      });
      const json = await res.json();

      const activities = GetActivitiesResponseSchema.safeParse(json[0]);
      if (!activities.success) {
        throw new Error("Failed to parse activities");
      }
      const activityLogs = GetActivityLogsResponseSchema.safeParse(json[1]);
      if (!activityLogs.success) {
        throw new Error("Failed to parse activity logs");
      }

      // 個別のキャッシュも更新
      queryClient.setQueryData(["activity"], activities.data);
      queryClient.setQueryData(
        ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
        activityLogs.data,
      );
      return { activities: activities.data, activityLogs: activityLogs.data };
    },
  });

  const activities = data?.activities ?? [];
  const activityLogs = data?.activityLogs ?? [];

  // アクティビティごとのログ存在チェック関数
  const hasActivityLogs = (activityId: string) => {
    return activityLogs.some((log) => log.activity.id === activityId);
  };

  return {
    activities,
    activityLogs,
    hasActivityLogs,
    error,
  };
}
