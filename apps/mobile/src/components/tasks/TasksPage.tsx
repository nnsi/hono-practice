import { useState } from "react";

import { isVirtualScheduledTask } from "@packages/frontend-shared/hooks/materializeScheduledTask";
import { useTranslation } from "@packages/i18n";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncEngine } from "../../sync/syncEngine";
import { mobileTestIds } from "../../testing/testIds";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { TaskGroup } from "./TaskGroup";
import { TaskSchedulesTab } from "./TaskSchedulesTab";
import { TasksActiveTab } from "./TasksActiveTab";
import { TasksTabs } from "./TasksTabs";
import { useTasksPage } from "./useTasksPage";

export function TasksPage() {
  const { t } = useTranslation("task");
  const [refreshing, setRefreshing] = useState(false);
  const {
    activeTab,
    setActiveTab,
    showCompleted,
    setShowCompleted,
    showFuture,
    setShowFuture,
    tasks,
    archivedTasks,
    groupedTasks,
    completedCount,
    futureCount,
    hasAnyTasks,
    createDialogOpen,
    setCreateDialogOpen,
    editingTask,
    setEditingTask,
    deleteConfirmId,
    setDeleteConfirmId,
    handleToggleDone,
    handleDelete,
    handleArchive,
    handleMoveToToday,
    handleCreateSuccess,
    handleEditSuccess,
  } = useTasksPage();

  const insets = useSafeAreaInsets();
  const deleteTarget = deleteConfirmId
    ? [...tasks, ...archivedTasks].find((t) => t.id === deleteConfirmId)
    : undefined;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-800"
      testID={mobileTestIds.tasks.page}
    >
      <TasksTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "active" && (
          <TasksActiveTab
            hasAnyTasks={hasAnyTasks}
            groupedTasks={groupedTasks}
            futureCount={futureCount}
            completedCount={completedCount}
            showFuture={showFuture}
            setShowFuture={setShowFuture}
            showCompleted={showCompleted}
            setShowCompleted={setShowCompleted}
            handleToggleDone={handleToggleDone}
            setEditingTask={setEditingTask}
            setDeleteConfirmId={setDeleteConfirmId}
            handleArchive={handleArchive}
            handleMoveToToday={handleMoveToToday}
            setCreateDialogOpen={setCreateDialogOpen}
          />
        )}

        {activeTab === "archived" && (
          <View>
            {archivedTasks.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-gray-500 dark:text-gray-400">
                  {t("page.empty")}
                </Text>
              </View>
            )}
            {archivedTasks.length > 0 && (
              <TaskGroup
                title={t("page.group.archived")}
                sectionKey="archived"
                tasks={archivedTasks}
                titleColor="text-gray-500 dark:text-gray-400"
                archived
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}
          </View>
        )}

        {activeTab === "schedules" && <TaskSchedulesTab />}
      </ScrollView>

      {createDialogOpen && (
        <TaskCreateDialog
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={handleEditSuccess}
          onDelete={(id) => {
            setEditingTask(null);
            setDeleteConfirmId(id);
          }}
        />
      )}

      {deleteConfirmId && (
        <DeleteConfirmDialog
          taskTitle={deleteTarget?.title || ""}
          variant={
            deleteTarget !== undefined && isVirtualScheduledTask(deleteTarget)
              ? "skipToday"
              : "task"
          }
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </View>
  );
}
