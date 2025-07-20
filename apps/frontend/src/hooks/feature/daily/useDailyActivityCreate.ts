import { useState } from "react";

import { useActivities } from "@frontend/hooks/api";

import type { GetActivityResponse } from "@dtos/response";

export const useDailyActivityCreate = (
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void,
) => {
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const { data: activities } = useActivities();

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
    onOpenChange(false);
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
