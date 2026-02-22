import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useTasksByDate } from "../../hooks/useTasks";
import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { db } from "../../db/schema";
import type {
  DexieActivity,
  DexieActivityLog,
  DexieActivityKind,
} from "../../db/schema";
import { LogCard } from "./LogCard";
import { TaskList } from "./TaskList";
import type { Task } from "./TaskList";
import { EditLogDialog } from "./EditLogDialog";
import { CreateLogDialog } from "./CreateLogDialog";

export function DailyPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);
  const { tasks: dexieTasks } = useTasksByDate(date);

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

  // DexieTask -> TaskList Task mapping
  const tasks: Task[] = useMemo(
    () =>
      dexieTasks.map((t) => ({
        id: t.id,
        title: t.title,
        doneDate: t.doneDate,
        memo: t.memo,
        startDate: t.startDate,
        dueDate: t.dueDate,
      })),
    [dexieTasks],
  );

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
  const handleToggleTask = useCallback(async (task: Task) => {
    const newDoneDate = task.doneDate
      ? null
      : new Date().toISOString().split("T")[0];
    await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
    syncEngine.syncTasks();
  }, []);

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
            isLoading={false}
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
