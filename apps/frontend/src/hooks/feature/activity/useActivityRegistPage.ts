import { useCallback, useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { GetActivityResponse } from "@dtos/response";

export const useActivityRegistPage = () => {
  const { date, setDate } = useGlobalDate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);

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

  // Event handlers
  const handleActivityClick = useCallback((activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  }, []);

  const handleNewActivityClick = useCallback(() => {
    setOpen(true);
  }, []);

  const handleEditClick = useCallback((activity: GetActivityResponse) => {
    setEditTargetActivity(activity);
    setEditModalOpen(true);
  }, []);

  const handleNewActivityDialogChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedActivity(null);
    }
  }, []);

  const handleActivityLogCreateDialogChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setSelectedActivity(null);
      }
    },
    [],
  );

  const handleActivityLogCreateSuccess = useCallback(() => {
    invalidateActivityCache();
  }, [invalidateActivityCache]);

  const handleActivityEditDialogClose = useCallback(() => {
    setEditModalOpen(false);
    setEditTargetActivity(null);
    invalidateActivityCache();
  }, [invalidateActivityCache]);

  const handleDeleteActivity = useCallback(() => {
    setEditModalOpen(false);
    setEditTargetActivity(null);
    invalidateActivityCache();
  }, [invalidateActivityCache]);

  return {
    date,
    setDate,
    activities,
    hasActivityLogs,
    invalidateActivityCache,
    open,
    selectedActivity,
    editModalOpen,
    editTargetActivity,
    handleActivityClick,
    handleNewActivityClick,
    handleEditClick,
    handleNewActivityDialogChange,
    handleActivityLogCreateDialogChange,
    handleActivityLogCreateSuccess,
    handleActivityEditDialogClose,
    handleDeleteActivity,
  };
};
