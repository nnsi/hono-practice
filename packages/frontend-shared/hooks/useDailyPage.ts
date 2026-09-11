import type { VirtualScheduledTask } from "@packages/domain/taskSchedule";

import { addDays, getToday } from "../utils/dateUtils";
import { toDailyTasks } from "./dailyTaskMapping";
import {
  type MaterializeTaskRepository,
  materializeScheduledTask,
} from "./materializeScheduledTask";
import { toggleTaskWithActivityLog } from "./taskToggleWithActivityLog";
import type {
  ActivityBase,
  ActivityLogBase,
  DailyTask,
  ReactHooks,
} from "./types";
import {
  type ScheduledTaskSourceDeps,
  createUseTodayScheduledTasks,
} from "./useTodayScheduledTasks";

type UseDailyPageDeps<
  TActivity extends ActivityBase,
  TKind extends { id: string },
  TRawTask extends DailyTask = DailyTask,
> = ScheduledTaskSourceDeps & {
  react: Pick<ReactHooks, "useState" | "useMemo" | "useCallback">;
  useActivities: () => { activities: TActivity[] };
  useActivityLogsByDate: (date: string) => { logs: ActivityLogBase[] };
  useTasksByDate: (date: string) => TRawTask[] | undefined;
  useAllKinds: () => TKind[] | undefined;
  taskRepository: MaterializeTaskRepository & {
    updateTask: (
      id: string,
      data: { doneDate: string | null },
    ) => Promise<unknown>;
  };
  activityLogRepository: {
    createActivityLog: (input: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
    softDeleteActivityLogByTaskId: (taskId: string) => Promise<void>;
  };
  syncEngine: {
    syncTasks: () => Promise<unknown>;
    syncActivityLogs: () => Promise<unknown>;
  };
};

export function createUseDailyPage<
  TActivity extends ActivityBase,
  TKind extends { id: string },
  TRawTask extends DailyTask = DailyTask,
>(deps: UseDailyPageDeps<TActivity, TKind, TRawTask>) {
  const {
    react: { useState, useMemo, useCallback },
    useActivities,
    useActivityLogsByDate,
    useTasksByDate,
    useAllKinds,
    useActiveTaskSchedules,
    useTasksOnScheduledDate,
    taskRepository,
    activityLogRepository,
    syncEngine,
  } = deps;

  const useTodayScheduledTasks = createUseTodayScheduledTasks({
    react: { useMemo },
    useActiveTaskSchedules,
    useTasksOnScheduledDate,
  });

  return function useDailyPage() {
    const [date, setDate] = useState(getToday());
    const [editingLog, setEditingLog] = useState<ActivityLogBase | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [taskCreateDialogOpen, setTaskCreateDialogOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const { activities } = useActivities();
    const { logs } = useActivityLogsByDate(date);
    const rawTasks = useTasksByDate(date);
    const allKinds = useAllKinds();
    const isToday = date === getToday();
    // 仮想タスクは「今日」を見ているときだけ出す（未来・過去の分は算出しない）
    const virtualTasks = useTodayScheduledTasks(date, isToday);
    const virtualTasksById = useMemo(
      () =>
        new Map<string, VirtualScheduledTask>(
          virtualTasks.map((t) => [t.id, t]),
        ),
      [virtualTasks],
    );

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
      () => toDailyTasks(rawTasks, virtualTasks),
      [rawTasks, virtualTasks],
    );

    const goToPrev = useCallback(() => setDate((d) => addDays(d, -1)), []);
    const goToNext = useCallback(() => setDate((d) => addDays(d, 1)), []);
    const pendingToggleTaskIds = useMemo(() => new Set<string>(), []);

    /**
     * 仮想タスクなら未完了の実 Task 行を作る（削除・編集など、行の存在を前提とする操作の前に呼ぶ）。
     * 実 Task ならなにもしない。
     */
    const materializeIfVirtual = useCallback(
      async (task: DailyTask) => {
        const virtual = virtualTasksById.get(task.id);
        if (virtual) await materializeScheduledTask(taskRepository, virtual);
      },
      [virtualTasksById],
    );

    /**
     * 編集ダイアログに渡す対象を id から引く。実 Task 行があればそれを、無ければ仮想タスク
     * （`isVirtual` 付き）を返す。仮想タスクの実体化は編集ダイアログの保存時に行う
     * （開いてキャンセルしただけでは行を作らない）。
     */
    const findEditableTask = useCallback(
      (id: string): TRawTask | VirtualScheduledTask | undefined =>
        rawTasks?.find((t) => t.id === id) ?? virtualTasksById.get(id),
      [rawTasks, virtualTasksById],
    );

    const handleToggleTask = useCallback(
      async (task: DailyTask) => {
        if (pendingToggleTaskIds.has(task.id)) {
          return;
        }
        pendingToggleTaskIds.add(task.id);
        try {
          // 仮想タスクは先に未完了の実 Task 行を作ってから既存 toggle に渡す
          const virtual = virtualTasksById.get(task.id);
          const target = virtual
            ? await materializeScheduledTask(taskRepository, virtual)
            : task;
          await toggleTaskWithActivityLog(
            { taskRepository, activityLogRepository, syncEngine },
            target,
            getToday(),
          );
        } finally {
          pendingToggleTaskIds.delete(task.id);
        }
      },
      [virtualTasksById],
    );

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
      rawTasks,
      editingLog,
      setEditingLog,
      createDialogOpen,
      setCreateDialogOpen,
      taskCreateDialogOpen,
      setTaskCreateDialogOpen,
      calendarOpen,
      setCalendarOpen,
      handleToggleTask,
      materializeIfVirtual,
      findEditableTask,
    };
  };
}
