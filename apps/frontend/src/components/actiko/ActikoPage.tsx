import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import { CalendarPopover } from "../common/CalendarPopover";
import { DailyTaskSection } from "../daily/DailyTaskSection";
import { EditLogDialog } from "../daily/EditLogDialog";
import { ActivityCard } from "./ActivityCard";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { DayLogList } from "./DayLogList";
import { EditActivityDialog } from "./EditActivityDialog";
import { RecordDialog } from "./RecordDialog";
import { ReorderActivitiesDialog } from "./ReorderActivitiesDialog";
import { useActikoPage } from "./useActikoPage";

/** 記録グリッド・その日の記録・その日のタスクを 1 画面にまとめたページ（Actiko + Daily 統合の試作） */
export function ActikoPage() {
  const { t } = useTranslation("actiko");
  const { t: tActivity } = useTranslation("activity");
  const page = useActikoPage();
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    gridActivities,
    iconBlobMap,
    summaryByActivity,
    logs,
    kindsMap,
    activitiesMap,
    selectedActivity,
    setSelectedActivity,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    editingLog,
    setEditingLog,
    calendarOpen,
    setCalendarOpen,
    reorderOpen,
    setReorderOpen,
  } = page;

  return (
    <div className="bg-white">
      {/* 日付ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-center gap-3 px-4 h-12">
          <button
            type="button"
            onClick={goToPrev}
            aria-label={tActivity("daily.previousDay")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={`flex items-center gap-1.5 text-base font-medium px-4 py-1 rounded-xl transition-all ${isToday ? "date-pill-today" : "hover:bg-gray-100"}`}
          >
            <Calendar size={14} />
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label={tActivity("daily.nextDay")}
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

      <main className="p-4 space-y-5">
        {/* 記録グリッド: タップで記録、カードにその日の合計を出す */}
        <section>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 stagger">
            {gridActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                summary={summaryByActivity.get(activity.id)}
                iconBlob={iconBlobMap.get(activity.id)}
                onClick={() => setSelectedActivity(activity)}
                onEdit={() => setEditActivity(activity)}
              />
            ))}
          </div>
          {/* 追加・並び替えはグリッドのカードにせず、高さを取らない操作行に置く */}
          <div className="flex items-center justify-end gap-1 mt-1.5">
            {gridActivities.length >= 2 && (
              <button
                type="button"
                onClick={() => setReorderOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowUpDown size={13} />
                {t("reorder")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreateActivityOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus size={13} />
              {t("add")}
            </button>
          </div>
        </section>

        {/* その日の記録: タップで編集・削除 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {tActivity("daily.recordsSection")}
            </h2>
            {logs.length > 0 && (
              <span className="text-xs text-gray-400 tabular-nums">
                {logs.length}
              </span>
            )}
          </div>
          <DayLogList
            logs={logs}
            activitiesMap={activitiesMap}
            kindsMap={kindsMap}
            onSelect={setEditingLog}
          />
        </section>

        {/* その日のタスク */}
        <DailyTaskSection {...page} />
      </main>

      {/* 記録ダイアログ */}
      {selectedActivity && (
        <RecordDialog
          activity={selectedActivity}
          date={date}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {/* 記録の編集ダイアログ */}
      {editingLog && (
        <EditLogDialog
          log={editingLog}
          activity={activitiesMap.get(editingLog.activityId) ?? null}
          onClose={() => setEditingLog(null)}
        />
      )}

      {/* アクティビティ作成ダイアログ */}
      {createActivityOpen && (
        <CreateActivityDialog
          onClose={() => setCreateActivityOpen(false)}
          onCreated={() => {}}
        />
      )}

      {/* アクティビティ編集ダイアログ */}
      {editActivity && (
        <EditActivityDialog
          activity={editActivity}
          onClose={() => setEditActivity(null)}
          onUpdated={() => {}}
        />
      )}

      {/* 並び替えダイアログ */}
      {reorderOpen && (
        <ReorderActivitiesDialog
          activities={gridActivities}
          onClose={() => setReorderOpen(false)}
        />
      )}
    </div>
  );
}
