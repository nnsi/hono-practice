import dayjs from "dayjs";
import type { ReactHooks, ActivityBase, ActivityLogBase, DailyTask } from "./types";

type UseDailyPageDeps<
  TActivity extends ActivityBase,
  TKind extends { id: string },
> = {
  react: Pick<ReactHooks, "useState" | "useMemo" | "useCallback">;
  useActivities: () => { activities: TActivity[] };
  useActivityLogsByDate: (date: string) => { logs: ActivityLogBase[] };
  useTasksByDate: (date: string) => DailyTask[] | undefined;
  useAllKinds: () => TKind[] | undefined;
  taskRepository: {
    updateTask: (
      id: string,
      data: { doneDate: string | null },
    ) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => void };
};

export function createUseDailyPage<
  TActivity extends ActivityBase,
  TKind extends { id: string },
>(deps: UseDailyPageDeps<TActivity, TKind>) {
  const {
    react: { useState, useMemo, useCallback },
    useActivities,
    useActivityLogsByDate,
    useTasksByDate,
    useAllKinds,
    taskRepository,
    syncEngine,
  } = deps;

  return function useDailyPage() {
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [editingLog, setEditingLog] = useState<ActivityLogBase | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [taskCreateDialogOpen, setTaskCreateDialogOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const { activities } = useActivities();
    const { logs } = useActivityLogsByDate(date);
    const rawTasks = useTasksByDate(date);
    const allKinds = useAllKinds();

    const kindsMap = useMemo(() => {
      const map = new Map<string, TKind>();
      for (const k of allKinds ?? []) map.set(k.id, k);
      return map;
    }, [allKinds]);

    const activitiesMap = useMemo(() => {
      const map = new Map<string, TActivity>();
      for (const a of activities) map.set(a.id, a);
      return map;
    }, [activities]);

    const tasks: DailyTask[] = useMemo(
      () =>
        (rawTasks ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          doneDate: t.doneDate,
          memo: t.memo,
          startDate: t.startDate,
          dueDate: t.dueDate,
        })),
      [rawTasks],
    );

    const goToPrev = useCallback(
      () => setDate((d) => dayjs(d).subtract(1, "day").format("YYYY-MM-DD")),
      [],
    );
    const goToNext = useCallback(
      () => setDate((d) => dayjs(d).add(1, "day").format("YYYY-MM-DD")),
      [],
    );
    const isToday = date === dayjs().format("YYYY-MM-DD");

    const handleToggleTask = useCallback(async (task: DailyTask) => {
      const newDoneDate = task.doneDate
        ? null
        : new Date().toISOString().split("T")[0];
      await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
      syncEngine.syncTasks();
    }, []);

    return {
      date,
      setDate,
      goToPrev,
      goToNext,
      isToday,
      activities,
      logs,
      kindsMap,
      activitiesMap,
      tasks,
      editingLog,
      setEditingLog,
      createDialogOpen,
      setCreateDialogOpen,
      taskCreateDialogOpen,
      setTaskCreateDialogOpen,
      calendarOpen,
      setCalendarOpen,
      handleToggleTask,
    };
  };
}
