import { useToast } from "@frontend/components/ui/use-toast";
import { useActivityLogSync } from "@frontend/hooks/sync";
import { useActivityLogSync as useActivityLogSyncE2E } from "@frontend/hooks/sync/useActivityLogSyncE2E";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { apiClient } from "@frontend/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogsResponse,
  GetActivityLogsResponseSchema,
  type GetActivityResponse,
} from "@dtos/response";

type UseActivityBatchDataOptions = {
  date: Date;
};

export function useActivityBatchData({ date }: UseActivityBatchDataOptions) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();
  const { toast } = useToast();

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
    enabled: isOnline,
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

  const isE2E = import.meta.env.VITE_E2E_TEST === "true";

  if (error && !isE2E) {
    toast({
      title: "エラー",
      description: "データの取得に失敗しました",
      variant: "destructive",
    });
  }

  // sync処理を使用してオフラインデータとマージ
  // E2E環境では簡略化されたフックを使用
  const syncHook = isE2E ? useActivityLogSyncE2E : useActivityLogSync;
  const { mergedActivityLogs, isOfflineData } = syncHook({
    date,
    isOnline,
    activityLogs: data?.activityLogs,
  });

  const activities = data?.activities ?? [];

  // アクティビティごとのログ存在チェック関数
  const hasActivityLogs = (activityId: string) => {
    return mergedActivityLogs.some((log) => log.activity.id === activityId);
  };

  return {
    activities,
    activityLogs: mergedActivityLogs,
    hasActivityLogs,
    isOfflineData,
    error,
  };
}
