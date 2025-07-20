import { useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityLogSync } from "@frontend/hooks/sync";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { apiClient, qp } from "@frontend/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogResponse,
  GetActivityLogsResponseSchema,
  GetTasksResponseSchema,
} from "@dtos/response";

export const useDailyPage = () => {
  const { date, setDate } = useGlobalDate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  const {
    data: activityLogs,
    error: _activityLogsError,
    isLoading,
  } = useQuery({
    ...qp({
      queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users["activity-logs"].$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetActivityLogsResponseSchema,
    }),
    placeholderData: () => {
      // キャッシュからデータを取得
      return queryClient.getQueryData([
        "activity-logs-daily",
        dayjs(date).format("YYYY-MM-DD"),
      ]);
    },
    // オフライン時でもデータを表示できるようにする
    networkMode: "offlineFirst",
    enabled: isOnline,
  });

  const cachedActivities = queryClient.getQueryData(["activity"]);

  useQuery({
    ...qp({
      queryKey: ["activity"],
      schema: GetActivitiesResponseSchema,
      queryFn: () => apiClient.users.activities.$get(),
    }),
    enabled: !cachedActivities && isOnline,
  });

  const {
    data: tasks,
    error: _tasksError,
    isLoading: isTasksLoading,
  } = useQuery({
    ...qp({
      queryKey: ["tasks", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users.tasks.$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetTasksResponseSchema,
    }),
    enabled: isOnline,
  });

  // sync処理をカスタムフックで管理
  const { mergedActivityLogs, isOfflineData } = useActivityLogSync({
    date,
    isOnline,
    activityLogs,
  });

  // ActivityLogカードのクリックハンドラ
  const handleActivityLogClick = (log: GetActivityLogResponse) => {
    setEditTargetLog(log);
    setEditDialogOpen(true);
  };

  // ActivityLogEditDialogのopen/close処理
  const handleActivityLogEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open);
  };

  return {
    // State
    date,
    setDate,
    editDialogOpen,
    editTargetLog,
    createDialogOpen,
    setCreateDialogOpen,

    // Data
    activityLogs,
    isLoading,
    tasks,
    isTasksLoading,
    mergedActivityLogs,
    isOfflineData,

    // Handlers
    handleActivityLogClick,
    handleActivityLogEditDialogChange,
  };
};
