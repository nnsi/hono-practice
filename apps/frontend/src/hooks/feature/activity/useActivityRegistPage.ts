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
    // バッチクエリのキーのみを無効化（これにより内部で個別のキャッシュも更新される）
    await queryClient.invalidateQueries({
      queryKey: ["activity", "activity-logs-daily", dateString],
    });
  };

  const { stateProps, actions } = createUseActivityRegistPage({
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
    activities: activities || [],
  });

  // Add handleDeleteActivity which is not in the shared implementation
  const handleDeleteActivity = () => {
    actions.onActivityEditDialogClose();
    invalidateActivityCache();
  };

  // 後方互換性を維持
  return {
    ...stateProps,
    // APIからの追加データ
    hasActivityLogs,
    // 旧API互換のアクション
    handleActivityClick: actions.onActivityClick,
    handleNewActivityClick: actions.onNewActivityClick,
    handleActivityEditDialogClose: actions.onActivityEditDialogClose,
    // 追加のヘルパー
    invalidateActivityCache,
    handleDeleteActivity,
    // 新しいグループ化されたAPIも公開
    stateProps,
    actions,
  };
};
