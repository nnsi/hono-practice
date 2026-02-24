import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useTasksByDate } from "../../hooks/useTasks";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { db } from "../../db/schema";
import type {
  DexieActivity,
  DexieActivityLog,
  DexieActivityKind,
} from "../../db/schema";
import type { Task } from "./TaskList";

export function useDailyPage() {
  // state
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [editingLog, setEditingLog] = useState<DexieActivityLog | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskCreateDialogOpen, setTaskCreateDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // data
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);
  const { tasks: dexieTasks } = useTasksByDate(date);

  const allKinds = useLiveQuery(
    () => db.activityKinds.filter((k) => !k.deletedAt).toArray(),
    [],
  );

  // computed
  const kindsMap = useMemo(() => {
    const map = new Map<string, DexieActivityKind>();
    for (const k of allKinds ?? []) {
      map.set(k.id, k);
    }
    return map;
  }, [allKinds]);

  const activitiesMap = useMemo(() => {
    const map = new Map<string, DexieActivity>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const tasks: Task[] = useMemo(
    () =>
      dexieTasks.map((t) => ({
        id: t.id,
        title: t.title,
        doneDate: t.doneDate,
        memo: t.memo,
        startDate: t.startDate,
        dueDate: t.dueDate,
      })),
    [dexieTasks],
  );

  const goToPrev = () =>
    setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () =>
    setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));
  const isToday = date === dayjs().format("YYYY-MM-DD");

  // handlers
  const handleToggleTask = useCallback(async (task: Task) => {
    const newDoneDate = task.doneDate
      ? null
      : new Date().toISOString().split("T")[0];
    await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
    syncEngine.syncTasks();
  }, []);

  return {
    // date
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    // data
    activities,
    logs,
    kindsMap,
    activitiesMap,
    tasks,
    // dialog state
    editingLog,
    setEditingLog,
    createDialogOpen,
    setCreateDialogOpen,
    taskCreateDialogOpen,
    setTaskCreateDialogOpen,
    calendarOpen,
    setCalendarOpen,
    // handlers
    handleToggleTask,
  };
}
