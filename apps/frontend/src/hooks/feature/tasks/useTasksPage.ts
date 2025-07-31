import { useMemo, useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import {
  createUseArchivedTasks,
  createUseTasks,
} from "@packages/frontend-shared/hooks";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

type TaskItem = {
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

export const useTasksPage = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // 全タスクを取得
  const { data: activeTasks, isLoading: isTasksLoading } = createUseTasks({
    apiClient,
    includeArchived: false,
  });

  // アーカイブ済みタスクを取得
  const { data: archivedTasks, isLoading: isArchivedTasksLoading } =
    createUseArchivedTasks({
      apiClient,
      enabled: activeTab === "archived",
    });

  // activeTabに応じてタスクを選択
  const tasks = activeTab === "active" ? activeTasks : undefined;

  // タスクを時間軸でグループ化
  const groupedTasks = useMemo(() => {
    if (!tasks)
      return {
        overdue: [],
        dueToday: [],
        startingToday: [],
        inProgress: [],
        dueThisWeek: [],
        notStarted: [],
        future: [],
        completed: [],
      };

    const today = dayjs().startOf("day");
    const nextWeek = today.add(7, "day");

    const groups: Record<string, TaskItem[]> = {
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
      const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
      const startDate = task.startDate ? dayjs(task.startDate) : null;

      // 完了済みタスク
      if (task.doneDate) {
        // 今日締切のタスクは完了しても今日締切カテゴリに表示
        if (dueDate?.isSame(today, "day")) {
          groups.dueToday.push(task);
          return;
        }

        // 今日開始のタスクは完了しても今日開始カテゴリに表示
        if (startDate?.isSame(today, "day")) {
          groups.startingToday.push(task);
          return;
        }

        // それ以外の完了済みタスクのみ完了済みカテゴリに表示
        groups.completed.push(task);
        return;
      }

      // 期限切れ（締切日が過去）
      if (dueDate?.isBefore(today)) {
        groups.overdue.push(task);
      }
      // 今日締切
      else if (dueDate?.isSame(today, "day")) {
        groups.dueToday.push(task);
      }
      // 今日開始（締切日は今日以降）
      else if (
        startDate?.isSame(today, "day") &&
        (!dueDate || dueDate.isAfter(today))
      ) {
        groups.startingToday.push(task);
      }
      // 進行中（開始日が過去で締切日が未来）
      else if (
        startDate?.isBefore(today) &&
        (!dueDate || dueDate.isAfter(today))
      ) {
        groups.inProgress.push(task);
      }
      // 今週締切（明日から7日以内）
      else if (dueDate?.isAfter(today) && dueDate.isBefore(nextWeek)) {
        groups.dueThisWeek.push(task);
      }
      // 未開始（開始日が未来）
      else if (startDate?.isAfter(today)) {
        groups.notStarted.push(task);
      }
      // 来週以降
      else {
        groups.future.push(task);
      }
    });

    // 各グループ内でソート
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        // 優先順位: 締切日 > 開始日
        const dateA = a.dueDate || a.startDate;
        const dateB = b.dueDate || b.startDate;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      });
    });

    return groups;
  }, [tasks]);

  const hasAnyTasks = Object.values(groupedTasks).some(
    (group) => group.length > 0,
  );

  const hasAnyArchivedTasks = archivedTasks && archivedTasks.length > 0;

  return {
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    createDialogOpen,
    setCreateDialogOpen,
    activeTab,
    setActiveTab,
    tasks,
    isTasksLoading,
    archivedTasks,
    isArchivedTasksLoading,
    groupedTasks,
    hasAnyTasks,
    hasAnyArchivedTasks,
  };
};
