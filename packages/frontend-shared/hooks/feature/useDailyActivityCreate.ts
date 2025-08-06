import { useState } from "react";

import type { GetActivityResponse } from "@dtos/response";

import { createUseActivities } from "..";

type UseDailyActivityCreateOptions = {
  apiClient: any; // APIクライアントの型は各プラットフォームで定義
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
};

export const createUseDailyActivityCreate = (
  options: UseDailyActivityCreateOptions,
) => {
  const { apiClient, onOpenChange, onSuccess } = options;
  const useActivities = createUseActivities({ apiClient });

  return () => {
    const [selectedActivity, setSelectedActivity] =
      useState<GetActivityResponse | null>(null);
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);

    const { activities } = useActivities();

    const handleActivitySelect = (activity: GetActivityResponse) => {
      setSelectedActivity(activity);
      setActivityDialogOpen(true);
    };

    const handleActivityDialogClose = (open: boolean) => {
      setActivityDialogOpen(open);
      if (!open) {
        setSelectedActivity(null);
      }
    };

    const handleSuccess = () => {
      setSelectedActivity(null);
      setActivityDialogOpen(false);
      onOpenChange?.(false);
      onSuccess?.();
    };

    return {
      selectedActivity,
      activityDialogOpen,
      activities,
      handleActivitySelect,
      handleActivityDialogClose,
      handleSuccess,
    };
  };
};
