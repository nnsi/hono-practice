import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useLiveQuery } from "../../db/useLiveQuery";
import { activityRepository } from "../../repositories/activityRepository";
import type { ActivityRecord } from "@packages/domain/activity/activityRecord";

type Activity = ActivityRecord & { _syncStatus: string };

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

export function useActikoPage() {
  // state
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // data
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);
  const iconBlobs = useLiveQuery(
    "activity_icon_blobs",
    () => activityRepository.getPendingIconBlobs(),
    []
  );

  // computed
  const iconBlobMap = useMemo(() => {
    const map = new Map<string, IconBlob>();
    for (const blob of iconBlobs ?? []) {
      map.set(blob.activityId, blob);
    }
    return map;
  }, [iconBlobs]);

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
    setDate,
    goToPrev,
    goToNext,
    isToday,
    // data
    activities,
    iconBlobMap,
    // dialog state
    selectedActivity,
    setSelectedActivity,
    dialogOpen,
    setDialogOpen,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    calendarOpen,
    setCalendarOpen,
    // handlers
    hasLogsForActivity,
    handleActivityClick,
    handleActivityChanged,
  };
}
