import { useEffect, useMemo } from "react";

import {
  createUseArchivedTasks,
  createUseTasks,
} from "@packages/frontend-shared/hooks";
import dayjs from "dayjs";

import { apiClient } from "../utils/apiClient";

type Task = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
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
  // 共通フックを使用してタスクを取得
  const {
    data: activeTasks,
    isLoading: isTasksLoading,
    refetch: refetchActiveTasks,
  } = createUseTasks({
    apiClient,
    includeArchived: false,
  });

  const {
    data: archivedTasks,
    isLoading: isArchivedTasksLoading,
    refetch: refetchArchivedTasks,
  } = createUseArchivedTasks({
    apiClient,
  });

  // tasksデータはnullやundefinedの場合は空配列を使用
  const tasks = activeTasks || [];
  const archived = archivedTasks || [];

  const refetch = async () => {
    await Promise.all([refetchActiveTasks(), refetchArchivedTasks()]);
  };

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
  const hasAnyArchivedTasks = archived.length > 0;

  return {
    groupedTasks,
    archivedTasks: archived,
    isTasksLoading,
    isArchivedTasksLoading,
    hasAnyTasks,
    hasAnyArchivedTasks,
    refetch,
  };
}
