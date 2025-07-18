import { useMemo, useState } from "react";

import { FloatingActionButton } from "@frontend/components/tasks/FloatingActionButton";
import { TaskCreateDialog } from "@frontend/components/tasks/TaskCreateDialog";
import { apiClient } from "@frontend/utils/apiClient";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { EmptyState } from "./EmptyState";
import { TaskGroup } from "./TaskGroup";

dayjs.extend(isBetween);

type TaskItem = {
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

export function TasksPage() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 全タスクを取得
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const response = await apiClient.users.tasks.$get({
        query: {},
      });
      if (!response.ok) {
        throw new Error("タスクの取得に失敗しました");
      }
      const data = await response.json();
      return data;
    },
  });

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

  return (
    <div className="min-h-screen relative">
      <div className="max-w-4xl mx-auto py-4 px-4 relative">
        {!hasAnyTasks && (
          <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
        )}
        <div className="space-y-6">
          {/* 期限切れ */}
          {groupedTasks.overdue.length > 0 && (
            <TaskGroup
              title="期限切れ"
              tasks={groupedTasks.overdue}
              isLoading={isTasksLoading}
              titleColor="text-red-600"
              highlight
            />
          )}

          {/* 今日締切 */}
          {groupedTasks.dueToday.length > 0 && (
            <TaskGroup
              title="今日締切"
              tasks={groupedTasks.dueToday}
              isLoading={isTasksLoading}
              titleColor="text-orange-600"
            />
          )}

          {/* 今日開始 */}
          {groupedTasks.startingToday.length > 0 && (
            <TaskGroup
              title="今日開始"
              tasks={groupedTasks.startingToday}
              isLoading={isTasksLoading}
              titleColor="text-blue-600"
            />
          )}

          {/* 進行中 */}
          {groupedTasks.inProgress.length > 0 && (
            <TaskGroup
              title="進行中"
              tasks={groupedTasks.inProgress}
              isLoading={isTasksLoading}
              titleColor="text-green-600"
            />
          )}

          {/* 完了済み */}
          {groupedTasks.completed.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                {showCompleted
                  ? "完了済みを隠す"
                  : `完了済み (${groupedTasks.completed.length})`}
              </button>
              {showCompleted && (
                <TaskGroup
                  title="完了済み"
                  tasks={groupedTasks.completed}
                  isLoading={isTasksLoading}
                  completed
                />
              )}
            </>
          )}
        </div>
      </div>
      <FloatingActionButton onClick={() => setCreateDialogOpen(true)} />
      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}

export default TasksPage;
