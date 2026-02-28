import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Plus, ChevronDown, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TaskGroup } from "./TaskGroup";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useTasksPage } from "./useTasksPage";

export function TasksPage() {
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
    <View className="flex-1 bg-white">
      {/* Tabs */}
      <View className="flex-row items-center px-1 h-12 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab("active")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "active" ? "bg-gray-100" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "active" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            アクティブ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("archived")}
          className={`flex-1 py-2.5 items-center rounded-xl mx-0.5 ${
            activeTab === "archived" ? "bg-gray-100" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === "archived" ? "text-gray-900" : "text-gray-400"
            }`}
          >
            アーカイブ済み
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 80 + insets.bottom }}
      >
        {activeTab === "active" && (
          <View className="gap-6">
            {!hasAnyTasks && (
              <View className="items-center py-12">
                <Text className="text-gray-500 mb-4">タスクがありません</Text>
                <TouchableOpacity
                  onPress={() => setCreateDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 rounded-lg"
                >
                  <Text className="text-white text-sm">
                    最初のタスクを作成
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Overdue */}
            {groupedTasks.overdue.length > 0 && (
              <TaskGroup
                title="期限切れ"
                tasks={groupedTasks.overdue}
                titleColor="text-red-600"
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
                title="今日締切"
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
                title="今日開始"
                tasks={groupedTasks.startingToday}
                titleColor="text-blue-600"
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
                title="進行中"
                tasks={groupedTasks.inProgress}
                titleColor="text-green-600"
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
                title="今週締切"
                tasks={groupedTasks.dueThisWeek}
                titleColor="text-gray-700"
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
                  <Text className="text-sm text-gray-500">
                    {showFuture
                      ? "未来のタスクを隠す"
                      : `未来のタスク (${futureCount})`}
                  </Text>
                </TouchableOpacity>
                {showFuture && (
                  <View className="mt-3 gap-6">
                    {groupedTasks.notStarted.length > 0 && (
                      <TaskGroup
                        title="未開始"
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
                        title="来週以降"
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
                  <Text className="text-sm text-gray-500">
                    {showCompleted
                      ? "完了済みを隠す"
                      : `完了済みを表示 (${completedCount})`}
                  </Text>
                </TouchableOpacity>
                {showCompleted && groupedTasks.completed.length > 0 && (
                  <View className="mt-3">
                    <TaskGroup
                      title="完了済み"
                      tasks={groupedTasks.completed}
                      titleColor="text-gray-500"
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
                className="py-5 border-2 border-dashed border-gray-300 rounded-xl bg-white flex-row items-center justify-center gap-2"
              >
                <Plus size={18} color="#9ca3af" />
                <Text className="text-sm text-gray-500">
                  新規タスクを追加
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === "archived" && (
          <View>
            {archivedTasks.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-gray-500">
                  アーカイブ済みのタスクはありません
                </Text>
              </View>
            )}
            {archivedTasks.length > 0 && (
              <TaskGroup
                title="アーカイブ済み"
                tasks={archivedTasks}
                titleColor="text-gray-500"
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
