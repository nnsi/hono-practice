import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { LogCard } from "./LogCard";
import { TaskList } from "./TaskList";
import { EditLogDialog } from "./EditLogDialog";
import { CreateLogDialog } from "./CreateLogDialog";
import { TaskCreateDialog } from "../tasks/TaskCreateDialog";
import { CalendarPopover } from "../common/CalendarPopover";
import { useDailyPage } from "./useDailyPage";

export function DailyPage() {
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activities,
    logs,
    kindsMap,
    activitiesMap,
    tasks,
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

  return (
    <div className="bg-white">
      {/* 日付ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="relative flex items-center justify-center h-12">
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`text-base font-medium px-4 py-1 rounded-xl transition-all ${
              isToday ? "date-pill-today" : "hover:bg-gray-100"
            }`}
          >
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-14 p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
          <CalendarPopover
            selectedDate={date}
            onDateSelect={setDate}
            isOpen={calendarOpen}
            onClose={() => setCalendarOpen(false)}
          />
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              タスク
            </h2>
            <button
              type="button"
              onClick={() => setTaskCreateDialogOpen(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />
              追加
            </button>
          </div>
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

      {/* タスク作成ダイアログ */}
      {taskCreateDialogOpen && (
        <TaskCreateDialog
          defaultDate={date}
          onClose={() => setTaskCreateDialogOpen(false)}
          onSuccess={() => setTaskCreateDialogOpen(false)}
        />
      )}
    </div>
  );
}
