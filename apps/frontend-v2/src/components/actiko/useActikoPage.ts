import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { db, type DexieActivity, type DexieActivityIconBlob } from "../../db/schema";

export function useActikoPage() {
  // state
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<DexieActivity | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // data
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);
  const iconBlobs = useLiveQuery(() => db.activityIconBlobs.toArray());

  // computed
  const iconBlobMap = useMemo(() => {
    const map = new Map<string, DexieActivityIconBlob>();
    for (const blob of iconBlobs ?? []) {
      map.set(blob.activityId, blob);
    }
    return map;
  }, [iconBlobs]);

  const isToday = date === dayjs().format("YYYY-MM-DD");

  // handlers
  const goToPrev = () =>
    setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () =>
    setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));

  const hasLogsForActivity = useCallback(
    (activityId: string) => logs.some((l) => l.activityId === activityId),
    [logs],
  );

  const handleActivityClick = (activity: DexieActivity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  // Dexie useLiveQueryで自動更新されるため、refreshは不要
  const handleActivityChanged = () => {
    // useLiveQuery が自動でUIを更新するため、何もしなくてOK
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
