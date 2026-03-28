import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

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

  return (
    <div className="bg-white min-h-full">
      {/* タブ */}
      <div className="sticky top-0 sticky-header z-10">
        <div className="flex items-center px-1 pr-14 h-12">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
              activeTab === "active"
                ? "text-gray-900 bg-white shadow-soft"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("page.tab.active")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
              activeTab === "archived"
                ? "text-gray-900 bg-white shadow-soft"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("page.tab.archived")}
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {activeTab === "active" && (
          <div className="space-y-6">
            {!hasAnyTasks && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{t("page.empty")}</p>
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {t("page.firstTask")}
                </button>
              </div>
            )}

            {/* 期限切れ */}
            {groupedTasks.overdue.length > 0 && (
              <TaskGroup
                title={t("page.group.overdue")}
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

            {/* 今日締切 */}
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

            {/* 今日開始 */}
            {groupedTasks.startingToday.length > 0 && (
              <TaskGroup
                title={t("page.group.startingToday")}
                tasks={groupedTasks.startingToday}
                titleColor="text-blue-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* 進行中 */}
            {groupedTasks.inProgress.length > 0 && (
              <TaskGroup
                title={t("page.group.inProgress")}
                tasks={groupedTasks.inProgress}
                titleColor="text-green-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* 今週締切 */}
            {groupedTasks.dueThisWeek.length > 0 && (
              <TaskGroup
                title={t("page.group.dueThisWeek")}
                tasks={groupedTasks.dueThisWeek}
                titleColor="text-gray-700"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
                onMoveToToday={handleMoveToToday}
              />
            )}

            {/* 未来のタスク（トグル） */}
            {futureCount > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFuture(!showFuture)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showFuture ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {showFuture
                    ? t("page.toggle.futureHide")
                    : t("page.toggle.futureShow", { count: futureCount })}
                </button>
                {showFuture && (
                  <div className="mt-3 space-y-6">
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
                  </div>
                )}
              </div>
            )}

            {/* 完了済み（トグル） */}
            {completedCount > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showCompleted ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {showCompleted
                    ? t("page.toggle.completedHide")
                    : t("page.toggle.completedShow", { count: completedCount })}
                </button>
                {showCompleted && groupedTasks.completed.length > 0 && (
                  <div className="mt-3">
                    <TaskGroup
                      title={t("page.group.completed")}
                      tasks={groupedTasks.completed}
                      titleColor="text-gray-500"
                      completed
                      onToggleDone={handleToggleDone}
                      onEdit={setEditingTask}
                      onDelete={setDeleteConfirmId}
                      onArchive={handleArchive}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 新規タスクを追加 */}
            {hasAnyTasks && (
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className="w-full py-5 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <Plus
                  size={18}
                  className="text-gray-400 group-hover:text-gray-600"
                />
                <span className="text-sm text-gray-500 group-hover:text-gray-700">
                  {t("page.addNew")}
                </span>
              </button>
            )}
          </div>
        )}

        {activeTab === "archived" && (
          <div>
            {archivedTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">{t("page.empty.archived")}</p>
              </div>
            )}
            {archivedTasks.length > 0 && (
              <TaskGroup
                title={t("page.tab.archived")}
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
          </div>
        )}
      </div>

      {/* 作成ダイアログ */}
      {createDialogOpen && (
        <TaskCreateDialog
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* 編集ダイアログ */}
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

      {/* 削除確認ダイアログ */}
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
    </div>
  );
}
