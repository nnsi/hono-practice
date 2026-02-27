import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogs } from "../../hooks/useActivityLogs";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useLiveQuery } from "../../db/useLiveQuery";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { Task } from "./TaskList";

export function useDailyPage() {
  // state
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [editingLog, setEditingLog] = useState<{
    id: string;
    activityId: string;
    activityKindId: string | null;
    quantity: number | null;
    memo: string;
    date: string;
    time: string | null;
  } | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskCreateDialogOpen, setTaskCreateDialogOpen] = useState(false);

  // data
  const { activities } = useActivities();
  const { logs } = useActivityLogs(date);
  const { kinds: allKinds } = useActivityKinds();

  const rawTasks = useLiveQuery(
    "tasks",
    () => taskRepository.getTasksByDate(date),
    [date],
  );

  // computed
  const kindsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string | null }>();
    for (const k of allKinds) {
      map.set(k.id, k);
    }
    return map;
  }, [allKinds]);

  const activitiesMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const tasks: Task[] = useMemo(
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
    // handlers
    handleToggleTask,
  };
}
