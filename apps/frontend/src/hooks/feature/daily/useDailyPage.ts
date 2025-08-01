import { useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivities, useActivityLogs, useTasks } from "@frontend/hooks/api";
import { useActivityLogSync } from "@frontend/hooks/sync";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import dayjs from "dayjs";

import type { GetActivityLogResponse } from "@dtos/response";

export const useDailyPage = () => {
  const { date, setDate } = useGlobalDate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { isOnline } = useNetworkStatusContext();

  const {
    data: activityLogs,
    error: _activityLogsError,
    isLoading,
  } = useActivityLogs(date, { enabled: isOnline });

  // アクティビティ一覧を取得
  useActivities();

  const {
    data: tasks,
    error: _tasksError,
    isLoading: isTasksLoading,
  } = useTasks({
    date: dayjs(date).format("YYYY-MM-DD"),
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
