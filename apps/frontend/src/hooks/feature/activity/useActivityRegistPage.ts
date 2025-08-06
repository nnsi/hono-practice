import { useGlobalDate } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { createUseActivityRegistPage } from "@packages/frontend-shared/hooks/feature";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

export const useActivityRegistPage = () => {
  const { selectedDate: date, setSelectedDate: setDate } = useGlobalDate();
  const queryClient = useQueryClient();

  // データ取得とsync処理をカスタムフックで管理
  const { activities, hasActivityLogs } = useActivityBatchData({ date });

  // キャッシュ無効化ヘルパー関数
  const invalidateActivityCache = async () => {
    const dateString = dayjs(date).format("YYYY-MM-DD");
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["activity"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["activity", "activity-logs-daily", dateString],
      }),
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dateString],
      }),
    ]);
    // 強制的に再フェッチ
    await queryClient.refetchQueries({
      queryKey: ["activity", "activity-logs-daily", dateString],
    });
  };

  const result = createUseActivityRegistPage({
    dateStore: {
      date,
      setDate,
    },
    api: {
      getActivities: async () => activities || [],
      hasActivityLogs: (activityId: string) => hasActivityLogs(activityId),
    },
    cache: {
      invalidateActivityCache,
    },
  });

  // Add handleDeleteActivity which is not in the shared implementation
  const handleDeleteActivity = () => {
    result.handleActivityEditDialogClose();
    invalidateActivityCache();
  };

  return {
    ...result,
    activities: activities || [],
    hasActivityLogs: (activityId: string) => hasActivityLogs(activityId),
    invalidateActivityCache,
    handleDeleteActivity,
  };
};
