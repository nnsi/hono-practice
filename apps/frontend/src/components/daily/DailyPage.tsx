import { useCallback, useMemo, useState } from "react";

import type { DailyTask } from "@packages/frontend-shared/hooks/types";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { taskRepository } from "../../db/taskRepository";
import { syncEngine } from "../../sync/syncEngine";
import { reportError } from "../../utils/errorReporter";
import { CalendarPopover } from "../common/CalendarPopover";
import { TaskQuickAdd } from "../tasks/TaskQuickAdd";
import { CreateLogDialog } from "./CreateLogDialog";
import { DailyTaskDialogs } from "./DailyTaskDialogs";
import { EditLogDialog } from "./EditLogDialog";
import { LogCard } from "./LogCard";
import { TaskList } from "./TaskList";
import { useDailyPage } from "./useDailyPage";

export function DailyPage() {
  const { t } = useTranslation("activity");
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
    materializeIfVirtual,
    findEditableTask,
  } = useDailyPage();

  const activeActivities = useMemo(
    () => activities.filter((a) => !a.deletedAt),
    [activities],
  );

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<DailyTask | null>(null);

  // 仮想タスクは isVirtual 付きのまま渡し、実体化は編集ダイアログの保存時に行う
  const editingFullTask = editingTaskId
    ? findEditableTask(editingTaskId)
    : null;

  const handleDeleteTask = useCallback(
    async (task: DailyTask) => {
      try {
        // 仮想タスクは行が無いので、先に実 Task 行を作ってから soft delete する（「今日はやらない」）
        await materializeIfVirtual(task);
        await taskRepository.softDeleteTask(task.id);
        void syncEngine.syncTasks().catch(() => {});
      } catch (error) {
        reportError({
          errorType: "db_query_error",
          message: `Daily task delete failed: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setDeletingTask(null);
      }
    },
    [materializeIfVirtual],
  );

  return (
    <div className="bg-white">
      {/* 日付ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-center gap-3 px-4 h-12">
          <button
            type="button"
            onClick={goToPrev}
            aria-label={t("daily.previousDay")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`flex items-center gap-1.5 text-base font-medium px-4 py-1 rounded-xl transition-all ${
              isToday ? "date-pill-today" : "hover:bg-gray-100"
            }`}
          >
            <Calendar size={14} />
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label={t("daily.nextDay")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
        <CalendarPopover
          selectedDate={date}
          onDateSelect={setDate}
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
        />
      </header>

      <main className="p-4 space-y-6">
        {/* アクティビティログ一覧 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {t("daily.activitySection")}
            </h2>
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />
              {t("daily.addButton")}
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
              {t("daily.noRecords")}
            </div>
          )}
        </section>

        <hr className="border-gray-200" />

        {/* タスク一覧 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {t("daily.tasksSection")}
            </h2>
            <button
              type="button"
              onClick={() => setTaskCreateDialogOpen(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />
              {t("daily.addButton")}
            </button>
          </div>
          <TaskQuickAdd key={date} defaultDate={date} />
          <TaskList
            tasks={tasks}
            isLoading={false}
            onToggle={handleToggleTask}
            onEdit={(task) => setEditingTaskId(task.id)}
            activitiesMap={activitiesMap}
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
          activities={activeActivities}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}

      {/* タスク系ダイアログ（作成 / 編集 / 削除確認） */}
      <DailyTaskDialogs
        date={date}
        createOpen={taskCreateDialogOpen}
        onCloseCreate={() => setTaskCreateDialogOpen(false)}
        editingTask={editingFullTask}
        onCloseEdit={() => setEditingTaskId(null)}
        onDeleteFromEdit={(id) => {
          setEditingTaskId(null);
          const task = tasks.find((t) => t.id === id);
          if (task) setDeletingTask(task);
        }}
        deletingTask={deletingTask}
        onConfirmDelete={handleDeleteTask}
        onCancelDelete={() => setDeletingTask(null)}
      />
    </div>
  );
}
