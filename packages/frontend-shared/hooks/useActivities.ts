import { useQuery } from "@tanstack/react-query";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import type { AppType } from "@backend/app";

export type UseActivitiesOptions = {
  apiClient: ReturnType<typeof import("hono/client").hc<AppType>>;
  date?: Date;
};

export type UseActivitiesReturn = {
  activities: GetActivityResponse[];
  activityLogs: GetActivityLogsResponse;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<any>;
};

/**
 * 全アクティビティ一覧と、日付が指定された場合はその日のアクティビティログを取得する共通フック
 *
 * WebとMobile両方で使えるように、apiClientを引数として受け取る設計
 */
export function createUseActivities(
  options: UseActivitiesOptions,
): UseActivitiesReturn {
  const { apiClient, date } = options;
  const dateString = date ? date.toISOString().split("T")[0] : null;

  const { data, error, isLoading, refetch } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: dateString
      ? ["activity", "activity-logs-daily", dateString]
      : ["activity"],
    queryFn: async () => {
      if (dateString) {
        // dateが指定されている場合は、バッチAPIで両方を取得
        const res = await apiClient.batch.$post({
          json: [
            {
              path: "/users/activities",
            },
            {
              path: `/users/activity-logs?date=${dateString}`,
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

        return { activities: activities.data, activityLogs: activityLogs.data };
      }

      // dateが指定されていない場合は、activitiesのみを取得
      const res = await apiClient.users.activities.$get();
      const json = await res.json();
      const activities = GetActivitiesResponseSchema.safeParse(json);
      if (!activities.success) {
        throw new Error("Failed to parse activities");
      }
      return { activities: activities.data, activityLogs: [] };
    },
  });

  return {
    activities: data?.activities ?? [],
    activityLogs: data?.activityLogs ?? [],
    error,
    isLoading,
    refetch,
  };
}
