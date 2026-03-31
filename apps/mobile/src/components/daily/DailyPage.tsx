import { useCallback, useMemo, useState } from "react";

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
import { DateNavHeader } from "../actiko/DateNavHeader";
import { CalendarPopover } from "../common/CalendarPopover";
import { DeleteConfirmDialog } from "../tasks/DeleteConfirmDialog";
import { TaskCreateDialog } from "../tasks/TaskCreateDialog";
import { TaskEditDialog } from "../tasks/TaskEditDialog";
import { CreateLogDialog } from "./CreateLogDialog";
import { DailyLogSection } from "./DailyLogSection";
import { EditLogDialog } from "./EditLogDialog";
import { type Task, TaskList } from "./TaskList";
import { useDailyPage } from "./useDailyPage";

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
  } = useDailyPage();

  const iconBlobMap = useIconBlobMap();
  const insets = useSafeAreaInsets();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const editingFullTask = useMemo(
    () =>
      editingTaskId ? rawTasks?.find((t) => t.id === editingTaskId) : null,
    [editingTaskId, rawTasks],
  );

  const handleDeleteTask = useCallback(async (id: string) => {
    await taskRepository.softDeleteTask(id);
    syncEngine.syncTasks();
    setDeletingTask(null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View className="flex-1">
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
            onEdit={(task) => setEditingTaskId(task.id)}
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

      {taskCreateDialogOpen && (
        <TaskCreateDialog
          defaultDate={date}
          onClose={() => setTaskCreateDialogOpen(false)}
          onSuccess={() => setTaskCreateDialogOpen(false)}
        />
      )}

      {editingFullTask && (
        <TaskEditDialog
          task={editingFullTask}
          onClose={() => setEditingTaskId(null)}
          onSuccess={() => setEditingTaskId(null)}
          onDelete={(id) => {
            setEditingTaskId(null);
            const task = tasks.find((t) => t.id === id);
            if (task) setDeletingTask(task);
          }}
        />
      )}

      {deletingTask && (
        <DeleteConfirmDialog
          taskTitle={deletingTask.title}
          onConfirm={() => handleDeleteTask(deletingTask.id)}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </View>
  );
}
