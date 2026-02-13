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

// Grouped return types for better organization
export type ActivityRegistPageStateProps = {
  date: Date;
  activities: GetActivityResponse[];
  open: boolean;
  selectedActivity: GetActivityResponse | null;
  editModalOpen: boolean;
  editTargetActivity: GetActivityResponse | null;
};

export type ActivityRegistPageActions = {
  onDateChange: (date: Date) => void;
  onActivityClick: (activity: GetActivityResponse) => void;
  onNewActivityClick: () => void;
  onEditClick: (activity: GetActivityResponse) => void;
  onNewActivityDialogChange: (open: boolean) => Promise<void>;
  onActivityLogCreateDialogChange: (open: boolean) => Promise<void>;
  onActivityLogCreateSuccess: () => void;
  onActivityEditDialogClose: () => void;
  hasActivityLogs: (activityId: string) => boolean;
};

export type UseActivityRegistPageReturn = {
  stateProps: ActivityRegistPageStateProps;
  actions: ActivityRegistPageActions;
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
    stateProps: {
      date,
      activities,
      open,
      selectedActivity,
      editModalOpen,
      editTargetActivity,
    } as ActivityRegistPageStateProps,
    actions: {
      onDateChange: setDate,
      onActivityClick: handleActivityClick,
      onNewActivityClick: handleNewActivityClick,
      onEditClick: handleEditClick,
      onNewActivityDialogChange: handleNewActivityDialogChange,
      onActivityLogCreateDialogChange: handleActivityLogCreateDialogChange,
      onActivityLogCreateSuccess: handleActivityLogCreateSuccess,
      onActivityEditDialogClose: handleActivityEditDialogClose,
      hasActivityLogs,
    } as ActivityRegistPageActions,
  };
}
