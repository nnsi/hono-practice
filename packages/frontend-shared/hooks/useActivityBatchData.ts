import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  GetActivityLogsResponseSchema,
} from "@dtos/response";

import type { AppType } from "@backend/app";

export type UseActivityBatchDataOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  date: Date;
};

export function createUseActivityBatchData(
  options: UseActivityBatchDataOptions & { onError?: (error: Error) => void },
) {
  const { apiClient, date, onError } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
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

  // エラー時のコールバック呼び出し
  if (query.error && onError) {
    onError(query.error as Error);
  }

  const activities = query.data?.activities ?? [];
  const activityLogs = query.data?.activityLogs ?? [];

  // アクティビティごとのログ存在チェック関数
  const hasActivityLogs = (activityId: string) => {
    return activityLogs.some((log) => log.activity.id === activityId);
  };

  return {
    activities,
    activityLogs,
    hasActivityLogs,
    error: query.error,
  };
}
