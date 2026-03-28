import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronRight, Plus } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { TaskGroup } from "./TaskGroup";
import { useTasksPage } from "./useTasksPage";

export function TasksPage() {
  const { t } = useTranslation("task");
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

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Tabs */}
      <View className="flex-row items-center px-1 h-12 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => setActiveTab("active")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "active" ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
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
      >
        {activeTab === "active" && (
          <View className="gap-6">
            {!hasAnyTasks && (
              <View className="items-center py-12">
                <Text className="text-gray-500 dark:text-gray-400 mb-4">
                  {t("page.empty")}
                </Text>
                <TouchableOpacity
                  onPress={() => setCreateDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 rounded-lg"
                >
                  <Text className="text-white text-sm">
                    {t("page.firstTask")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Overdue */}
            {groupedTasks.overdue.length > 0 && (
              <TaskGroup
                title={t("page.group.overdue")}
                tasks={groupedTasks.overdue}
                titleColor="text-red-600 dark:text-red-400"
                highlight
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* Due today */}
            {groupedTasks.dueToday.length > 0 && (
              <TaskGroup
                title={t("page.group.dueToday")}
                tasks={groupedTasks.dueToday}
                titleColor="text-orange-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* Starting today */}
            {groupedTasks.startingToday.length > 0 && (
              <TaskGroup
                title={t("page.group.startingToday")}
                tasks={groupedTasks.startingToday}
                titleColor="text-blue-600 dark:text-blue-400"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* In progress */}
            {groupedTasks.inProgress.length > 0 && (
              <TaskGroup
                title={t("page.group.inProgress")}
                tasks={groupedTasks.inProgress}
                titleColor="text-green-600 dark:text-green-400"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* Due this week */}
            {groupedTasks.dueThisWeek.length > 0 && (
              <TaskGroup
                title={t("page.group.dueThisWeek")}
                tasks={groupedTasks.dueThisWeek}
                titleColor="text-gray-700 dark:text-gray-300"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* Future tasks (toggle) */}
            {futureCount > 0 && (
              <View>
                <TouchableOpacity
                  onPress={() => setShowFuture(!showFuture)}
                  className="flex-row items-center gap-1"
                >
                  {showFuture ? (
                    <ChevronDown size={16} color="#6b7280" />
                  ) : (
                    <ChevronRight size={16} color="#6b7280" />
                  )}
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {showFuture
                      ? "未来のタスクを隠す"
                      : `未来のタスク (${futureCount})`}
                  </Text>
                </TouchableOpacity>
                {showFuture && (
                  <View className="mt-3 gap-6">
                    {groupedTasks.notStarted.length > 0 && (
                      <TaskGroup
                        title={t("page.group.notStarted")}
                        tasks={groupedTasks.notStarted}
                        titleColor="text-purple-600"
                        onToggleDone={handleToggleDone}
                        onEdit={setEditingTask}
                        onDelete={setDeleteConfirmId}
                        onArchive={handleArchive}
                      />
                    )}
                    {groupedTasks.future.length > 0 && (
                      <TaskGroup
                        title={t("page.group.future")}
                        tasks={groupedTasks.future}
                        titleColor="text-indigo-600"
                        onToggleDone={handleToggleDone}
                        onEdit={setEditingTask}
                        onDelete={setDeleteConfirmId}
                        onArchive={handleArchive}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Completed (toggle) */}
            {completedCount > 0 && (
              <View>
                <TouchableOpacity
                  onPress={() => setShowCompleted(!showCompleted)}
                  className="flex-row items-center gap-1"
                >
                  {showCompleted ? (
                    <ChevronDown size={16} color="#6b7280" />
                  ) : (
                    <ChevronRight size={16} color="#6b7280" />
                  )}
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {showCompleted
                      ? "完了済みを隠す"
                      : `完了済みを表示 (${completedCount})`}
                  </Text>
                </TouchableOpacity>
                {showCompleted && groupedTasks.completed.length > 0 && (
                  <View className="mt-3">
                    <TaskGroup
                      title={t("page.group.completed")}
                      tasks={groupedTasks.completed}
                      titleColor="text-gray-500 dark:text-gray-400"
                      completed
                      onToggleDone={handleToggleDone}
                      onEdit={setEditingTask}
                      onDelete={setDeleteConfirmId}
                      onArchive={handleArchive}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Add new task button */}
            {hasAnyTasks && (
              <TouchableOpacity
                onPress={() => setCreateDialogOpen(true)}
                className="py-5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 flex-row items-center justify-center gap-2"
              >
                <Plus size={18} color="#9ca3af" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("page.addNew")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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

      {/* Create dialog */}
      {createDialogOpen && (
        <TaskCreateDialog
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Edit dialog */}
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

      {/* Delete confirm dialog */}
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
