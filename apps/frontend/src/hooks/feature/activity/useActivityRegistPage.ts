import { useGlobalDate } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { createUseActivityRegistPage } from "@packages/frontend-shared";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

export const useActivityRegistPage = () => {
  const { date, setDate } = useGlobalDate();
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

  // Create dependencies
  const dependencies = {
    dateStore: {
      date,
      setDate,
    },
    api: {
      getActivities: async () => {
        // Return cached activities from React Query
        return activities;
      },
      hasActivityLogs: (activityId: string) => {
        return hasActivityLogs(activityId);
      },
    },
    cache: {
      invalidateActivityCache,
    },
  };

  // Use the common hook
  const commonResult = createUseActivityRegistPage(dependencies);

  // Override with React Query data for consistency
  return {
    ...commonResult,
    activities, // Use React Query's latest data
    hasActivityLogs,
  };
};
