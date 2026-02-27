import { useCallback, useState } from "react";
import dayjs from "dayjs";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogs } from "../../hooks/useActivityLogs";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";

type Activity = ActivityRecord & { _syncStatus: string };

export function useActikoPage() {
  // state
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

  // data
  const { activities } = useActivities();
  const { logs } = useActivityLogs(date);

  // computed
  const isToday = date === dayjs().format("YYYY-MM-DD");

  // handlers
  const goToPrev = useCallback(() => {
    setDate((d) => dayjs(d).subtract(1, "day").format("YYYY-MM-DD"));
  }, []);

  const goToNext = useCallback(() => {
    setDate((d) => dayjs(d).add(1, "day").format("YYYY-MM-DD"));
  }, []);

  const hasLogsForActivity = useCallback(
    (activityId: string) => logs.some((l) => l.activityId === activityId),
    [logs]
  );

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  const handleActivityChanged = () => {
    // useLiveQuery handles reactivity automatically
  };

  return {
    // date
    date,
    goToPrev,
    goToNext,
    isToday,
    // data
    activities,
    // dialog state
    selectedActivity,
    setSelectedActivity,
    dialogOpen,
    setDialogOpen,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    // handlers
    hasLogsForActivity,
    handleActivityClick,
    handleActivityChanged,
  };
}
