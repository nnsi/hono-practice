import { useQuery } from "@tanstack/react-query";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

import { apiClient } from "../utils/apiClient";

export const useActivities = (date?: Date) => {
  const dateString = date ? date.toISOString().split("T")[0] : null;

  const { data, error, isLoading } = useQuery<{
    activities: GetActivityResponse[];
    activityLogs: GetActivityLogsResponse;
  }>({
    queryKey: dateString
      ? ["activity", "activity-logs-daily", dateString]
      : ["activities"],
    queryFn: async () => {
      if (dateString) {
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
  };
};
