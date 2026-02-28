import dayjs from "dayjs";
import type { ReactHooks, ActivityBase, IconBlobBase } from "./types";

type UseActikoPageDeps<
  TActivity extends ActivityBase,
  TIconBlob extends IconBlobBase,
> = {
  react: Pick<ReactHooks, "useState" | "useMemo" | "useCallback">;
  useActivities: () => { activities: TActivity[] };
  useActivityLogsByDate: (date: string) => { logs: { activityId: string }[] };
  useIconBlobs: () => TIconBlob[] | undefined;
};

export function createUseActikoPage<
  TActivity extends ActivityBase,
  TIconBlob extends IconBlobBase,
>(deps: UseActikoPageDeps<TActivity, TIconBlob>) {
  const {
    react: { useState, useMemo, useCallback },
    useActivities,
    useActivityLogsByDate,
    useIconBlobs,
  } = deps;

  return function useActikoPage() {
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [selectedActivity, setSelectedActivity] =
      useState<TActivity | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [createActivityOpen, setCreateActivityOpen] = useState(false);
    const [editActivity, setEditActivity] = useState<TActivity | null>(null);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const { activities } = useActivities();
    const { logs } = useActivityLogsByDate(date);
    const iconBlobs = useIconBlobs();

    const iconBlobMap = useMemo(() => {
      const map = new Map<string, TIconBlob>();
      for (const blob of iconBlobs ?? []) {
        map.set(blob.activityId, blob);
      }
      return map;
    }, [iconBlobs]);

    const isToday = date === dayjs().format("YYYY-MM-DD");

    const goToPrev = useCallback(() => {
      setDate((d) => dayjs(d).subtract(1, "day").format("YYYY-MM-DD"));
    }, []);

    const goToNext = useCallback(() => {
      setDate((d) => dayjs(d).add(1, "day").format("YYYY-MM-DD"));
    }, []);

    const hasLogsForActivity = useCallback(
      (activityId: string) => logs.some((l) => l.activityId === activityId),
      [logs],
    );

    const handleActivityClick = (activity: TActivity) => {
      setSelectedActivity(activity);
      setDialogOpen(true);
    };

    const handleActivityChanged = () => {
      // useLiveQuery handles reactivity automatically
    };

    return {
      date,
      setDate,
      goToPrev,
      goToNext,
      isToday,
      activities,
      iconBlobMap,
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
      hasLogsForActivity,
      handleActivityClick,
      handleActivityChanged,
    };
  };
}
