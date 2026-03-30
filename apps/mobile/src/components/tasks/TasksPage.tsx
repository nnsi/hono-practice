import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { syncEngine } from "../../sync/syncEngine";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { TaskGroup } from "./TaskGroup";
import { TasksActiveTab } from "./TasksActiveTab";
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Tabs */}
      <View
        className="flex-row items-center px-1 h-12 border-b border-gray-100 dark:border-gray-800"
        style={{ paddingRight: 48 }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab("active")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "active" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
          accessibilityRole="tab"
          accessibilityLabel={t("page.tab.active")}
          accessibilityState={{ selected: activeTab === "active" }}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "active"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {t("page.tab.active")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("archived")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "archived" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
          accessibilityRole="tab"
          accessibilityLabel={t("page.tab.archived")}
          accessibilityState={{ selected: activeTab === "archived" }}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "archived"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {t("page.tab.archived")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
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
          taskTitle={
            [...tasks, ...archivedTasks].find((t) => t.id === deleteConfirmId)
              ?.title || ""
          }
          onConfirm={() => handleDelete(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </View>
  );
}
