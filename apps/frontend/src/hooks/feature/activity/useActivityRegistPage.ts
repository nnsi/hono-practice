import { useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityBatchData } from "@frontend/hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type { GetActivityResponse } from "@dtos/response";

export const useActivityRegistPage = () => {
  const { date, setDate } = useGlobalDate();
  const queryClient = useQueryClient();

  // 状態管理
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

  // アクティビティクリック時の処理
  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  };

  // 新規アクティビティボタンクリック時の処理
  const handleNewActivityClick = () => {
    setOpen(true);
  };

  // 編集ボタンクリック時の処理
  const handleEditClick = (activity: GetActivityResponse) => {
    setEditTargetActivity(activity);
    setEditModalOpen(true);
  };

  // NewActivityDialogのopen/close処理
  const handleNewActivityDialogChange = async (open: boolean) => {
    setOpen(open);
    // ダイアログが閉じた時にキャッシュを無効化して最新データを取得
    if (!open) {
      await invalidateActivityCache();
    }
  };

  // ActivityLogCreateDialogのopen/close処理
  const handleActivityLogCreateDialogChange = async (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSelectedActivity(null);
      await invalidateActivityCache();
    }
  };

  // ActivityLogCreateDialogのsuccess処理
  const handleActivityLogCreateSuccess = () => {
    invalidateActivityCache();
  };

  // ActivityEditDialogのclose処理
  const handleActivityEditDialogClose = () => {
    setEditModalOpen(false);
  };

  return {
    // 状態
    date,
    setDate,
    activities,
    hasActivityLogs,
    open,
    selectedActivity,
    editModalOpen,
    editTargetActivity,

    // ハンドラー
    handleActivityClick,
    handleNewActivityClick,
    handleEditClick,
    handleNewActivityDialogChange,
    handleActivityLogCreateDialogChange,
    handleActivityLogCreateSuccess,
    handleActivityEditDialogClose,
  };
};
