import { useCallback, useState } from "react";

import type { GetActivityResponse } from "@dtos/response";

export type ActivityRegistPageDependencies = {
  dateStore: {
    date: Date;
    setDate: (date: Date) => void;
  };
  api: {
    getActivities: () => Promise<GetActivityResponse[]>;
    hasActivityLogs: (activityId: string) => boolean;
  };
  cache?: {
    invalidateActivityCache: () => Promise<void>;
  };
  activities?: GetActivityResponse[]; // 外部から渡されるactivities
};

export function createUseActivityRegistPage(
  dependencies: ActivityRegistPageDependencies,
) {
  const { dateStore, api, cache } = dependencies;
  const { date, setDate } = dateStore;

  // 状態管理
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);
  // activitiesは外部から提供される
  const activities = dependencies.activities || [];

  // アクティビティクリック時の処理
  const handleActivityClick = useCallback((activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setOpen(true);
  }, []);

  // 新規アクティビティボタンクリック時の処理
  const handleNewActivityClick = useCallback(() => {
    setOpen(true);
  }, []);

  // 編集ボタンクリック時の処理
  const handleEditClick = useCallback((activity: GetActivityResponse) => {
    setEditTargetActivity(activity);
    setEditModalOpen(true);
  }, []);

  // NewActivityDialogのopen/close処理
  const handleNewActivityDialogChange = useCallback(
    async (open: boolean) => {
      setOpen(open);
      // ダイアログが閉じた時にキャッシュを無効化して最新データを取得
      if (!open && cache?.invalidateActivityCache) {
        await cache.invalidateActivityCache();
      }
    },
    [cache],
  );

  // ActivityLogCreateDialogのopen/close処理
  const handleActivityLogCreateDialogChange = useCallback(
    async (open: boolean) => {
      setOpen(open);
      if (!open) {
        setSelectedActivity(null);
        if (cache?.invalidateActivityCache) {
          await cache.invalidateActivityCache();
        }
      }
    },
    [cache],
  );

  // ActivityLogCreateDialogのsuccess処理
  const handleActivityLogCreateSuccess = useCallback(() => {
    if (cache?.invalidateActivityCache) {
      cache.invalidateActivityCache();
    }
  }, [cache]);

  // ActivityEditDialogのclose処理
  const handleActivityEditDialogClose = useCallback(() => {
    setEditModalOpen(false);
  }, []);

  // hasActivityLogsを各アクティビティに対してチェック
  const hasActivityLogs = useCallback(
    (activityId: string) => {
      return api.hasActivityLogs(activityId);
    },
    [api],
  );

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
}
