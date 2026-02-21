import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { useActivityLogsByDate } from "../hooks/useActivityLogs";
import { useActivityKinds } from "../hooks/useActivityKinds";
import { activityLogRepository } from "../db/activityLogRepository";
import { syncEngine } from "../sync/syncEngine";
import { apiFetch } from "../utils/apiClient";
import { db } from "../db/schema";
import type {
  DexieActivity,
  DexieActivityLog,
  DexieActivityKind,
} from "../db/schema";

// --- タスク型定義 ---

type Task = {
  id: string;
  title: string;
  doneDate: string | null;
  memo: string;
  startDate: string | null;
  dueDate: string | null;
};

// --- メインコンポーネント ---

export function DailyPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);

  // 全kinds取得（ログ表示用）
  const allKinds = useLiveQuery(
    () => db.activityKinds.filter((k) => !k.deletedAt).toArray(),
    [],
  );
  const kindsMap = useMemo(() => {
    const map = new Map<string, DexieActivityKind>();
    for (const k of allKinds ?? []) {
      map.set(k.id, k);
    }
    return map;
  }, [allKinds]);

  // アクティビティマップ
  const activitiesMap = useMemo(() => {
    const map = new Map<string, DexieActivity>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  // タスク取得
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  useEffect(() => {
    setIsTasksLoading(true);
    apiFetch(`/users/tasks?date=${date}`)
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch(() => setTasks([]))
      .finally(() => setIsTasksLoading(false));
  }, [date]);

  // ダイアログ状態
  const [editingLog, setEditingLog] = useState<DexieActivityLog | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 日付ナビゲーション
  const goToPrev = () =>
    setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () =>
    setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));
  const goToToday = () => setDate(dayjs().format("YYYY-MM-DD"));
  const isToday = date === dayjs().format("YYYY-MM-DD");

  // タスクトグル
  const handleToggleTask = useCallback(
    async (task: Task) => {
      const newDoneDate = task.doneDate
        ? null
        : new Date().toISOString().split("T")[0];
      await apiFetch(`/users/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ done_date: newDoneDate }),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, doneDate: newDoneDate } : t,
        ),
      );
    },
    [],
  );

  return (
    <div className="bg-white">
      {/* 日付ヘッダー */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={goToPrev}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className={`text-base font-medium px-3 py-1 rounded-lg ${
              isToday ? "bg-black text-white" : "hover:bg-gray-100"
            }`}
          >
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* アクティビティログ一覧 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              アクティビティ
            </h2>
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />
              追加
            </button>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => {
                const activity = activitiesMap.get(log.activityId);
                const kind = log.activityKindId
                  ? kindsMap.get(log.activityKindId)
                  : null;
                return (
                  <LogCard
                    key={log.id}
                    log={log}
                    activity={activity ?? null}
                    kind={kind ?? null}
                    onClick={() => setEditingLog(log)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              記録がありません
            </div>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* タスク一覧 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            タスク
          </h2>
          <TaskList
            tasks={tasks}
            isLoading={isTasksLoading}
            onToggle={handleToggleTask}
          />
        </section>
      </main>

      {/* 編集ダイアログ */}
      {editingLog && (
        <EditLogDialog
          log={editingLog}
          activity={activitiesMap.get(editingLog.activityId) ?? null}
          onClose={() => setEditingLog(null)}
        />
      )}

      {/* 新規作成ダイアログ */}
      {createDialogOpen && (
        <CreateLogDialog
          date={date}
          activities={activities}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </div>
  );
}

// --- ログカード ---

function LogCard({
  log,
  activity,
  kind,
  onClick,
}: {
  log: DexieActivityLog;
  activity: DexieActivity | null;
  kind: DexieActivityKind | null;
  onClick: () => void;
}) {
  const isPending = log._syncStatus === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 active:scale-[0.98] hover:shadow-md text-left ${
        isPending
          ? "border-orange-200 bg-orange-50/50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      {/* アイコン */}
      <span className="flex items-center justify-center w-10 h-10 text-2xl shrink-0">
        {activity ? (
          activity.iconType === "upload" && activity.iconThumbnailUrl ? (
            <img
              src={activity.iconThumbnailUrl}
              alt={activity.name}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            activity.emoji || "📝"
          )
        ) : (
          "📝"
        )}
      </span>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-base truncate">
            {activity?.name ?? "不明"}
          </span>
          {kind && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
              {kind.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: kind.color }}
                />
              )}
              {kind.name}
            </span>
          )}
          {isPending && (
            <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
          )}
        </div>
        <div className="text-sm text-gray-500">
          {log.quantity !== null
            ? `${log.quantity}${activity?.quantityUnit ?? ""}`
            : "-"}
        </div>
        {log.memo && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">
            {log.memo}
          </div>
        )}
      </div>
    </button>
  );
}

// --- タスクリスト ---

function TaskList({
  tasks,
  isLoading,
  onToggle,
}: {
  tasks: Task[];
  isLoading: boolean;
  onToggle: (task: Task) => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Loader2 size={20} className="animate-spin inline-block" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">タスクはありません</div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white"
        >
          <button
            type="button"
            onClick={() => onToggle(task)}
            className="shrink-0 p-0.5"
          >
            {task.doneDate ? (
              <CheckCircle2 size={24} className="text-green-500" />
            ) : (
              <Circle size={24} className="text-gray-300" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div
              className={`text-base font-medium ${
                task.doneDate ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {task.title}
            </div>
            {task.memo && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">
                {task.memo}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- 編集ダイアログ ---

function EditLogDialog({
  log,
  activity,
  onClose,
}: {
  log: DexieActivityLog;
  activity: DexieActivity | null;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(
    log.quantity !== null ? String(log.quantity) : "",
  );
  const [memo, setMemo] = useState(log.memo);
  const [selectedKindId, setSelectedKindId] = useState<string | null>(
    log.activityKindId,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { kinds } = useActivityKinds(log.activityId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await activityLogRepository.update(log.id, {
      quantity: quantity !== "" ? Number(quantity) : null,
      memo,
      activityKindId: selectedKindId,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await activityLogRepository.softDelete(log.id);
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">
              {activity?.emoji || "📝"}
            </span>
            {activity?.name ?? "不明"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                種類
              </label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(
                        selectedKindId === kind.id ? null : kind.id,
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedKindId === kind.id
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {kind.color && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: kind.color }}
                      />
                    )}
                    {kind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              数量{" "}
              {activity?.quantityUnit && `(${activity.quantityUnit})`}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="any"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="メモを入力..."
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              保存
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// --- 新規作成ダイアログ ---

function CreateLogDialog({
  date,
  activities,
  onClose,
}: {
  date: string;
  activities: DexieActivity[];
  onClose: () => void;
}) {
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);

  if (selectedActivity) {
    return (
      <CreateLogFormDialog
        date={date}
        activity={selectedActivity}
        onBack={() => setSelectedActivity(null)}
        onClose={onClose}
      />
    );
  }

  // アクティビティ選択画面
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-3">
          <h2 className="text-lg font-bold">アクティビティを選択</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 space-y-2">
          {activities.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              アクティビティがありません
            </div>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all text-left"
              >
                <span className="flex items-center justify-center w-10 h-10 text-2xl shrink-0">
                  {activity.iconType === "upload" &&
                  activity.iconThumbnailUrl ? (
                    <img
                      src={activity.iconThumbnailUrl}
                      alt={activity.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    activity.emoji || "📝"
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">{activity.name}</div>
                  {activity.quantityUnit && (
                    <div className="text-xs text-gray-400">
                      {activity.quantityUnit}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- 新規作成フォームダイアログ ---

function CreateLogFormDialog({
  date,
  activity,
  onBack,
  onClose,
}: {
  date: string;
  activity: DexieActivity;
  onBack: () => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [memo, setMemo] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { kinds } = useActivityKinds(activity.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await activityLogRepository.create({
      activityId: activity.id,
      activityKindId: selectedKindId,
      quantity: quantity !== "" ? Number(quantity) : null,
      memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">
                {activity.emoji || "📝"}
              </span>
              {activity.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                種類
              </label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(
                        selectedKindId === kind.id ? null : kind.id,
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedKindId === kind.id
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {kind.color && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: kind.color }}
                      />
                    )}
                    {kind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              数量{" "}
              {activity.quantityUnit && `(${activity.quantityUnit})`}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              min="0"
              step="any"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="メモを入力..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            記録する
          </button>
        </form>
      </div>
    </div>
  );
}
