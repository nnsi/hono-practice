import { useCallback, useState } from "react";

import type { DailyTask } from "@packages/frontend-shared/hooks/types";
import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react";

import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { reportError } from "../../utils/errorReporter";
import { TaskQuickAdd } from "../tasks/TaskQuickAdd";
import { DailyTaskDialogs } from "./DailyTaskDialogs";
import { TaskList } from "./TaskList";
import type { useDailyPage } from "./useDailyPage";

type Props = Pick<
  ReturnType<typeof useDailyPage>,
  | "date"
  | "tasks"
  | "activitiesMap"
  | "taskCreateDialogOpen"
  | "setTaskCreateDialogOpen"
  | "handleToggleTask"
  | "materializeIfVirtual"
  | "findEditableTask"
>;

/** その日のタスク節（見出し・クイック追加・一覧・作成 / 編集 / 削除ダイアログ） */
export function DailyTaskSection({
  date,
  tasks,
  activitiesMap,
  taskCreateDialogOpen,
  setTaskCreateDialogOpen,
  handleToggleTask,
  materializeIfVirtual,
  findEditableTask,
}: Props) {
  const { t } = useTranslation("activity");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<DailyTask | null>(null);

  // 仮想タスクは isVirtual 付きのまま渡し、実体化は編集ダイアログの保存時に行う
  const editingFullTask = editingTaskId
    ? findEditableTask(editingTaskId)
    : null;

  const handleDeleteTask = useCallback(
    async (task: DailyTask) => {
      try {
        // 仮想タスクは行が無いので、先に実 Task 行を作ってから soft delete する（「今日はやらない」）
        await materializeIfVirtual(task);
        await taskRepository.softDeleteTask(task.id);
        void syncEngine.syncTasks().catch(() => {});
      } catch (error) {
        reportError({
          errorType: "db_query_error",
          message: `Daily task delete failed: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setDeletingTask(null);
      }
    },
    [materializeIfVirtual],
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {t("daily.tasksSection")}
        </h2>
        <button
          type="button"
          onClick={() => setTaskCreateDialogOpen(true)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={16} />
          {t("daily.addButton")}
        </button>
      </div>
      <TaskQuickAdd key={date} defaultDate={date} />
      <TaskList
        tasks={tasks}
        isLoading={false}
        onToggle={handleToggleTask}
        onEdit={(task) => setEditingTaskId(task.id)}
        activitiesMap={activitiesMap}
      />

      {/* タスク系ダイアログ（作成 / 編集 / 削除確認） */}
      <DailyTaskDialogs
        date={date}
        createOpen={taskCreateDialogOpen}
        onCloseCreate={() => setTaskCreateDialogOpen(false)}
        editingTask={editingFullTask}
        onCloseEdit={() => setEditingTaskId(null)}
        onDeleteFromEdit={(id) => {
          setEditingTaskId(null);
          const task = tasks.find((t) => t.id === id);
          if (task) setDeletingTask(task);
        }}
        deletingTask={deletingTask}
        onConfirmDelete={handleDeleteTask}
        onCancelDelete={() => setDeletingTask(null)}
      />
    </section>
  );
}
