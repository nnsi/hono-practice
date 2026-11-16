import { useCallback, useState } from "react";

import type { ErrorReport } from "@packages/frontend-shared";
import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { mobileTestIds } from "../../testing/testIds";
import { reportError } from "../../utils/errorReporter";
import { TaskQuickAdd } from "../tasks/TaskQuickAdd";
import { DailyTaskDialogs } from "./DailyTaskDialogs";
import { type Task, TaskList } from "./TaskList";
import type { useDailyPage } from "./useDailyPage";

const toDeleteErrorReport = (error: unknown): ErrorReport => ({
  errorType: "db_query_error",
  message: `Daily task delete failed: ${error instanceof Error ? error.message : String(error)}`,
  stack: error instanceof Error ? error.stack : undefined,
});

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
> & {
  iconBlobMap: Map<string, { base64: string; mimeType: string }>;
};

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
  iconBlobMap,
}: Props) {
  const { t } = useTranslation("activity");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // 仮想タスクは isVirtual 付きのまま渡し、実体化は編集ダイアログの保存時に行う
  const editingFullTask = editingTaskId
    ? findEditableTask(editingTaskId)
    : null;

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      try {
        // 仮想タスクは行が無いので、先に実 Task 行を作ってから soft delete する（「今日はやらない」）
        await materializeIfVirtual(task);
        await taskRepository.softDeleteTask(task.id);
        syncEngine.syncTasks();
      } catch (error) {
        reportError(toDeleteErrorReport(error));
      } finally {
        setDeletingTask(null);
      }
    },
    [materializeIfVirtual],
  );

  return (
    <View className="px-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("daily.tasksSection")}
        </Text>
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={() => setTaskCreateDialogOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("daily.addButton")}
          testID={mobileTestIds.daily.addActivityButton}
        >
          <Plus size={16} color="#2563eb" />
          <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {t("daily.addButton")}
          </Text>
        </TouchableOpacity>
      </View>
      <TaskQuickAdd key={date} defaultDate={date} />
      <TaskList
        tasks={tasks}
        isLoading={false}
        onToggle={handleToggleTask}
        onEdit={(task) => setEditingTaskId(task.id)}
        onDelete={setDeletingTask}
        activitiesMap={activitiesMap}
        iconBlobMap={iconBlobMap}
      />

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
    </View>
  );
}
