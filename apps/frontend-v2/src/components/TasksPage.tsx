import { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  Plus,
  Circle,
  CheckCircle2,
  Archive,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  FileText,
} from "lucide-react";
import { apiFetch } from "../utils/apiClient";

dayjs.extend(isBetween);

// ============================================================
// Types
// ============================================================

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type GroupedTasks = {
  overdue: TaskItem[];
  dueToday: TaskItem[];
  startingToday: TaskItem[];
  inProgress: TaskItem[];
  dueThisWeek: TaskItem[];
  notStarted: TaskItem[];
  future: TaskItem[];
  completed: TaskItem[];
};

// ============================================================
// Task Grouping Logic
// ============================================================

function groupTasksByTimeline(
  tasks: TaskItem[],
  options: {
    showCompleted: boolean;
    showFuture: boolean;
    completedInTheirCategories?: boolean;
  },
): GroupedTasks {
  const today = dayjs().startOf("day");
  const nextWeek = today.add(7, "day");

  const groups: GroupedTasks = {
    overdue: [],
    dueToday: [],
    startingToday: [],
    inProgress: [],
    dueThisWeek: [],
    notStarted: [],
    future: [],
    completed: [],
  };

  for (const task of tasks) {
    const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
    const startDate = task.startDate ? dayjs(task.startDate) : null;

    // Handle completed tasks
    if (task.doneDate) {
      if (options.completedInTheirCategories) {
        if (dueDate?.isSame(today, "day")) {
          groups.dueToday.push(task);
          continue;
        }
        if (startDate?.isSame(today, "day")) {
          groups.startingToday.push(task);
          continue;
        }
      }
      if (options.showCompleted) {
        groups.completed.push(task);
      }
      continue;
    }

    // Categorize non-completed tasks
    if (dueDate?.isBefore(today)) {
      groups.overdue.push(task);
    } else if (dueDate?.isSame(today, "day")) {
      groups.dueToday.push(task);
    } else if (
      startDate?.isSame(today, "day") &&
      (!dueDate || dueDate.isAfter(today))
    ) {
      groups.startingToday.push(task);
    } else if (
      startDate?.isBefore(today) &&
      (!dueDate || dueDate.isAfter(today))
    ) {
      groups.inProgress.push(task);
    } else if (dueDate?.isAfter(today) && dueDate.isBefore(nextWeek)) {
      groups.dueThisWeek.push(task);
    } else if (startDate?.isAfter(today)) {
      groups.notStarted.push(task);
    } else if (options.showFuture) {
      groups.future.push(task);
    }
  }

  // Sort each group by due date, then start date
  for (const key of Object.keys(groups) as (keyof GroupedTasks)[]) {
    groups[key].sort((a, b) => {
      const dateA = a.dueDate || a.startDate;
      const dateB = b.dueDate || b.startDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });
  }

  return groups;
}

// ============================================================
// TasksPage (Main)
// ============================================================

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

// ============================================================
// TaskGroup
// ============================================================

function TaskGroup({
  title,
  tasks,
  titleColor = "text-gray-700",
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
}: {
  title: string;
  tasks: TaskItem[];
  titleColor?: string;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onArchive: (task: TaskItem) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 className={`text-sm font-semibold ${titleColor} mb-2`}>
        {title}{" "}
        <span className="text-xs text-gray-400 font-normal">
          ({tasks.length})
        </span>
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            highlight={highlight}
            completed={completed}
            archived={archived}
            onToggleDone={() => onToggleDone(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
            onArchive={() => onArchive(task)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TaskCard
// ============================================================

function TaskCard({
  task,
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
}: {
  task: TaskItem;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl border transition-all duration-150
        ${highlight ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}
        ${!completed && !archived ? "hover:shadow-md" : ""}
        ${completed ? "opacity-70" : ""}
      `}
    >
      {/* チェックボックス */}
      {!archived && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={task.doneDate ? "未完了に戻す" : "完了にする"}
        >
          {task.doneDate ? (
            <CheckCircle2 size={22} className="text-green-500" />
          ) : (
            <Circle size={22} className="text-gray-400" />
          )}
        </button>
      )}

      {/* タスク本体 */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div
          className={`text-sm font-medium truncate ${
            completed || task.doneDate
              ? "line-through text-gray-500"
              : "text-gray-900"
          }`}
        >
          {task.title}
        </div>
        {(task.startDate || task.dueDate) && (
          <div className="flex items-center gap-1 mt-0.5">
            <CalendarDays size={12} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {task.startDate &&
                `${dayjs(task.startDate).format("MM/DD")}`}
              {task.startDate && task.dueDate && " - "}
              {task.dueDate &&
                `${dayjs(task.dueDate).format("MM/DD")}`}
            </span>
            {task.doneDate && (
              <span className="text-xs text-green-600 ml-2">
                完了: {dayjs(task.doneDate).format("MM/DD")}
              </span>
            )}
          </div>
        )}
        {task.memo && (
          <div className="flex items-center gap-1 mt-0.5">
            <FileText size={12} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 truncate">{task.memo}</span>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* 完了済みタスクのアーカイブボタン */}
        {task.doneDate && !archived && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="アーカイブ"
          >
            <Archive size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="編集"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="削除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TaskCreateDialog
// ============================================================

function TaskCreateDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const body: Record<string, string> = {
      title: title.trim(),
      startDate,
    };
    if (dueDate) body.dueDate = dueDate;
    if (memo.trim()) body.memo = memo.trim();

    const res = await apiFetch("/users/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setIsSubmitting(false);

    if (res.ok) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新しいタスクを作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトルを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限（任意）
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="タスクに関するメモを入力"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TaskEditDialog
// ============================================================

function TaskEditDialog({
  task,
  onClose,
  onSuccess,
  onDelete,
}: {
  task: TaskItem;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.startDate || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [memo, setMemo] = useState(task.memo || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isArchived = !!task.archivedAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const body: Record<string, string | null | undefined> = {};
    if (title.trim() !== task.title) body.title = title.trim();
    if (startDate !== (task.startDate || ""))
      body.startDate = startDate || undefined;
    if (dueDate !== (task.dueDate || ""))
      body.dueDate = dueDate || null;
    if (memo.trim() !== (task.memo || "")) body.memo = memo.trim() || undefined;

    const res = await apiFetch(`/users/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    setIsSubmitting(false);

    if (res.ok) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">タスクを編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {isArchived && (
          <p className="text-xs text-gray-500 mb-3">
            アーカイブ済みタスクはメモの編集と削除のみ可能です
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスクのタイトル"
              disabled={isArchived}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              autoFocus
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isArchived}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期限（任意）
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isArchived}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メモ（任意）
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="タスクに関するメモ"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              削除
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// DeleteConfirmDialog
// ============================================================

function DeleteConfirmDialog({
  taskTitle,
  onConfirm,
  onCancel,
}: {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-sm rounded-xl p-5">
        <h2 className="text-lg font-bold mb-2">タスクを削除しますか？</h2>
        <p className="text-sm text-gray-500 mb-4">
          この操作は取り消せません。タスク「{taskTitle}」を完全に削除します。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
