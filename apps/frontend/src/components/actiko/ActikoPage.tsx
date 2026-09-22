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
import { ActivityCard } from "./ActivityCard";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { ReorderActivitiesDialog } from "./ReorderActivitiesDialog";
import { useActikoPage } from "./useActikoPage";

export function ActikoPage() {
  const { t } = useTranslation("actiko");
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activities,
    iconBlobMap,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    calendarOpen,
    setCalendarOpen,
    hasLogsForActivity,
    handleActivityChanged,
    reorderOpen,
    setReorderOpen,
    expandedActivityId,
    handleCardTap,
    collapseCard,
    handleInlineSaved,
    undoActivityId,
    handleUndo,
  } = useActikoPage();

  return (
    <div className="bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-center gap-3 px-4 h-12">
          <button
            type="button"
            onClick={goToPrev}
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

      {/* アクティビティグリッド */}
      <main className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isDone={hasLogsForActivity(activity.id)}
              iconBlob={iconBlobMap.get(activity.id)}
              date={date}
              expanded={expandedActivityId === activity.id}
              undoAvailable={undoActivityId === activity.id}
              onClick={() => handleCardTap(activity)}
              onEdit={() => setEditActivity(activity)}
              onCollapse={collapseCard}
              onSaved={() => handleInlineSaved(activity)}
              onUndo={() => handleUndo(activity.id)}
            />
          ))}
          {/* 新規追加カード */}
          <button
            type="button"
            onClick={() => setCreateActivityOpen(true)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-gray-300 min-h-[120px] select-none hover:border-gray-400 hover:bg-gray-50 transition-all group"
          >
            <Plus
              size={28}
              className="text-gray-400 group-hover:text-gray-600 mb-1"
            />
            <span className="text-xs text-gray-400 group-hover:text-gray-600">
              {t("add")}
            </span>
          </button>
          {/* 並び替えカード */}
          {activities.length >= 2 && (
            <button
              type="button"
              onClick={() => setReorderOpen(true)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-gray-300 min-h-[120px] select-none hover:border-gray-400 hover:bg-gray-50 transition-all group"
            >
              <ArrowUpDown
                size={28}
                className="text-gray-400 group-hover:text-gray-600 mb-1"
              />
              <span className="text-xs text-gray-400 group-hover:text-gray-600">
                {t("reorder")}
              </span>
            </button>
          )}
        </div>
      </main>

      {/* アクティビティ作成ダイアログ */}
      {createActivityOpen && (
        <CreateActivityDialog
          onClose={() => setCreateActivityOpen(false)}
          onCreated={handleActivityChanged}
        />
      )}

      {/* アクティビティ編集ダイアログ */}
      {editActivity && (
        <EditActivityDialog
          activity={editActivity}
          onClose={() => setEditActivity(null)}
          onUpdated={handleActivityChanged}
        />
      )}

      {/* 並び替えダイアログ */}
      {reorderOpen && (
        <ReorderActivitiesDialog
          activities={activities}
          onClose={() => setReorderOpen(false)}
        />
      )}
    </div>
  );
}
