import { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "../../utils/apiClient";
import type { TaskItem } from "./types";
import { groupTasksByTimeline } from "./taskGrouping";
import { TaskGroup } from "./TaskGroup";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isArchivedLoading, setIsArchivedLoading] = useState(false);

  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch active tasks
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    const res = await apiFetch("/users/tasks");
    if (res.ok) {
      const data: TaskItem[] = await res.json();
      setTasks(data.filter((t) => !t.archivedAt));
    }
    setIsLoading(false);
  }, []);

  // Fetch archived tasks
  const fetchArchivedTasks = useCallback(async () => {
    setIsArchivedLoading(true);
    const res = await apiFetch("/users/tasks/archived");
    if (res.ok) {
      const data: TaskItem[] = await res.json();
      setArchivedTasks(data);
    }
    setIsArchivedLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (activeTab === "archived") {
      fetchArchivedTasks();
    }
  }, [activeTab, fetchArchivedTasks]);

  // Grouping
  const groupedTasks = useMemo(
    () =>
      groupTasksByTimeline(tasks, {
        showCompleted,
        showFuture,
        completedInTheirCategories: true,
      }),
    [tasks, showCompleted, showFuture],
  );

  // Count completed tasks for toggle label (always count regardless of showCompleted)
  const completedCount = useMemo(() => {
    const allGrouped = groupTasksByTimeline(tasks, {
      showCompleted: true,
      showFuture,
      completedInTheirCategories: true,
    });
    return allGrouped.completed.length;
  }, [tasks, showFuture]);

  const futureCount = useMemo(() => {
    const allGrouped = groupTasksByTimeline(tasks, {
      showCompleted,
      showFuture: true,
      completedInTheirCategories: true,
    });
    return allGrouped.notStarted.length + allGrouped.future.length;
  }, [tasks, showCompleted]);

  // Actions
  const handleToggleDone = async (task: TaskItem) => {
    const newDoneDate = task.doneDate ? null : dayjs().format("YYYY-MM-DD");
    const res = await apiFetch(`/users/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ doneDate: newDoneDate }),
    });
    if (res.ok) {
      fetchTasks();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/users/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchTasks();
      fetchArchivedTasks();
    }
  };

  const handleArchive = async (task: TaskItem) => {
    const res = await apiFetch(`/users/tasks/${task.id}/archive`, {
      method: "POST",
    });
    if (res.ok) {
      fetchTasks();
    }
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchTasks();
  };

  const handleEditSuccess = () => {
    setEditingTask(null);
    fetchTasks();
  };

  const hasAnyTasks =
    tasks.length > 0 ||
    Object.values(groupedTasks).some((g) => g.length > 0);

  return (
    <div className="bg-white min-h-full">
      {/* タブ */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === "active"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            アクティブ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === "archived"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            アーカイブ済み
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {activeTab === "active" && (
          <div className="space-y-6">
            {isLoading && tasks.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                読み込み中...
              </div>
            )}

            {!isLoading && !hasAnyTasks && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">タスクがありません</p>
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  最初のタスクを作成
                </button>
              </div>
            )}

            {/* 期限切れ */}
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
              />
            )}

            {/* 今日締切 */}
            {groupedTasks.dueToday.length > 0 && (
              <TaskGroup
                title="今日締切"
                tasks={groupedTasks.dueToday}
                titleColor="text-orange-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
              />
            )}

            {/* 今日開始 */}
            {groupedTasks.startingToday.length > 0 && (
              <TaskGroup
                title="今日開始"
                tasks={groupedTasks.startingToday}
                titleColor="text-blue-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
              />
            )}

            {/* 進行中 */}
            {groupedTasks.inProgress.length > 0 && (
              <TaskGroup
                title="進行中"
                tasks={groupedTasks.inProgress}
                titleColor="text-green-600"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
              />
            )}

            {/* 今週締切 */}
            {groupedTasks.dueThisWeek.length > 0 && (
              <TaskGroup
                title="今週締切"
                tasks={groupedTasks.dueThisWeek}
                titleColor="text-gray-700"
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onDelete={setDeleteConfirmId}
                onArchive={handleArchive}
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
                    ? "未来のタスクを隠す"
                    : `未来のタスク (${futureCount})`}
                </button>
                {showFuture && (
                  <div className="mt-3 space-y-6">
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
                    ? "完了済みを隠す"
                    : `完了済みを表示 (${completedCount})`}
                </button>
                {showCompleted && groupedTasks.completed.length > 0 && (
                  <div className="mt-3">
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
                  新規タスクを追加
                </span>
              </button>
            )}
          </div>
        )}

        {activeTab === "archived" && (
          <div>
            {isArchivedLoading && archivedTasks.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                読み込み中...
              </div>
            )}
            {!isArchivedLoading && archivedTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  アーカイブ済みのタスクはありません
                </p>
              </div>
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
