import { useCallback, useState } from "react";

import type { ErrorReport } from "@packages/frontend-shared";
import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react-native";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { taskRepository } from "../../repositories/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { mobileTestIds } from "../../testing/testIds";
import { reportError } from "../../utils/errorReporter";
import { DateNavHeader } from "../actiko/DateNavHeader";
import { CalendarPopover } from "../common/CalendarPopover";
import { CreateLogDialog } from "./CreateLogDialog";
import { DailyLogSection } from "./DailyLogSection";
import { DailyTaskDialogs } from "./DailyTaskDialogs";
import { EditLogDialog } from "./EditLogDialog";
import { type Task, TaskList } from "./TaskList";
import { useDailyPage } from "./useDailyPage";

const toDeleteErrorReport = (error: unknown): ErrorReport => ({
  errorType: "db_query_error",
  message: `Daily task delete failed: ${error instanceof Error ? error.message : String(error)}`,
  stack: error instanceof Error ? error.stack : undefined,
});

export function DailyPage() {
  const { t } = useTranslation("activity");
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
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
    materializeIfVirtual,
    findEditableTask,
  } = useDailyPage();

  const iconBlobMap = useIconBlobMap();
  const insets = useSafeAreaInsets();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 仮想タスクは isVirtual 付きのまま渡し、実体化は編集ダイアログの保存時に行う
  const editingFullTask = editingTaskId
    ? findEditableTask(editingTaskId)
    : null;

  const handleEditTask = (task: Task) => setEditingTaskId(task.id);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View
      className="flex-1"
      collapsable={false}
      testID={mobileTestIds.daily.screen}
    >
      <DateNavHeader
        date={date}
        isToday={isToday}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
      />

      <CalendarPopover
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={date}
        onDateSelect={setDate}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <DailyLogSection
          logs={logs}
          activitiesMap={activitiesMap}
          kindsMap={kindsMap}
          iconBlobMap={iconBlobMap}
          onAddPress={() => setCreateDialogOpen(true)}
          onLogPress={setEditingLog}
        />

        <View className="mx-4 my-6 border-b border-gray-200 dark:border-gray-700" />

        {/* Tasks section */}
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
          <TaskList
            tasks={tasks}
            isLoading={false}
            onToggle={handleToggleTask}
            onEdit={handleEditTask}
            onDelete={setDeletingTask}
            activitiesMap={activitiesMap}
            iconBlobMap={iconBlobMap}
          />
        </View>
      </ScrollView>

      {editingLog && (
        <EditLogDialog
          log={editingLog}
          activity={activitiesMap.get(editingLog.activityId) ?? null}
          onClose={() => setEditingLog(null)}
        />
      )}

      <CreateLogDialog
        visible={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        date={date}
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
