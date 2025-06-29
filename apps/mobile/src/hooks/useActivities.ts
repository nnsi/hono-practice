import { useQuery } from "@tanstack/react-query";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import { apiClient } from "../utils/apiClient";

export const useActivities = (date: Date) => {
  const dateString = date.toISOString().split("T")[0];

  const { data, error, isLoading } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: ["activity", "activity-logs-daily", dateString],
    queryFn: async () => {
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
    },
  });

  return {
    activities: data?.activities ?? [],
    activityLogs: data?.activityLogs ?? [],
    error,
    isLoading,
  };
};
