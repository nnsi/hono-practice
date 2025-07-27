import { useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";

import { apiClient } from "../utils/apiClient";
import { eventBus } from "../utils/eventBus";

type Task = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type GroupedTasks = {
  overdue: Task[];
  dueToday: Task[];
  startingToday: Task[];
  inProgress: Task[];
  dueThisWeek: Task[];
  notStarted: Task[];
  future: Task[];
  completed: Task[];
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [isArchivedTasksLoading, setIsArchivedTasksLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const response = await apiClient.users.tasks.$get({
        query: {},
      });
      if (response.ok) {
        const data = await response.json();
        const activeTasks = data.filter((task: Task) => !task.archivedAt);
        const archived = data.filter((task: Task) => task.archivedAt);
        setTasks(activeTasks);
        setArchivedTasks(archived);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsTasksLoading(false);
      setIsArchivedTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // イベントリスナーを登録
    const unsubscribe = eventBus.on("tasks:refresh", fetchTasks);
    return unsubscribe;
  }, []);

  const groupedTasks = useMemo<GroupedTasks>(() => {
    const today = dayjs().startOf("day");
    const thisWeekEnd = today.endOf("week");

    const groups: GroupedTasks = {
      overdue: [],
      dueToday: [],
      startingToday: [],
      inProgress: [],
      dueThisWeek: [],
      notStarted: [],
      future: [],
      completed: [],
    };

    tasks.forEach((task) => {
      const startDate = task.startDate ? dayjs(task.startDate) : null;
      const dueDate = task.dueDate ? dayjs(task.dueDate) : null;

      // 完了済み
      if (task.doneDate) {
        groups.completed.push(task);
        return;
      }

      // 期限切れ
      if (dueDate?.isBefore(today)) {
        groups.overdue.push(task);
        return;
      }

      // 今日締切
      if (dueDate?.isSame(today, "day")) {
        groups.dueToday.push(task);
        return;
      }

      // 今日開始
      if (startDate?.isSame(today, "day")) {
        groups.startingToday.push(task);
        return;
      }

      // 進行中（開始日が過去で、期限が未来または未設定）
      if (startDate?.isBefore(today) && (!dueDate || dueDate.isAfter(today))) {
        groups.inProgress.push(task);
        return;
      }

      // 今週締切
      if (dueDate?.isAfter(today) && dueDate.isBefore(thisWeekEnd)) {
        groups.dueThisWeek.push(task);
        return;
      }

      // 未開始（開始日が未来）
      if (startDate?.isAfter(today)) {
        groups.notStarted.push(task);
        return;
      }

      // その他（来週以降）
      groups.future.push(task);
    });

    // 各グループをソート
    Object.keys(groups).forEach((key) => {
      const groupKey = key as keyof GroupedTasks;
      groups[groupKey].sort((a, b) => {
        // 期限でソート
        if (a.dueDate && b.dueDate) {
          return dayjs(a.dueDate).diff(dayjs(b.dueDate));
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        // 開始日でソート
        if (a.startDate && b.startDate) {
          return dayjs(a.startDate).diff(dayjs(b.startDate));
        }
        if (a.startDate) return -1;
        if (b.startDate) return 1;

        // 作成日でソート
        return dayjs(b.createdAt).diff(dayjs(a.createdAt));
      });
    });

    return groups;
  }, [tasks]);

  const hasAnyTasks = tasks.length > 0;
  const hasAnyArchivedTasks = archivedTasks.length > 0;

  return {
    groupedTasks,
    archivedTasks,
    isTasksLoading,
    isArchivedTasksLoading,
    hasAnyTasks,
    hasAnyArchivedTasks,
    refetch: fetchTasks,
  };
}
