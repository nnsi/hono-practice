import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { CalendarPopover } from "../common/CalendarPopover";
import { useActikoPage } from "./useActikoPage";

export function ActikoPage() {
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activities,
    iconBlobMap,
    selectedActivity,
    setSelectedActivity,
    dialogOpen,
    setDialogOpen,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    calendarOpen,
    setCalendarOpen,
    hasLogsForActivity,
    handleActivityClick,
    handleActivityChanged,
  } = useActikoPage();

  return (
    <div className="bg-white">
      {/* ヘッダー */}
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
            className={`text-base font-medium px-4 py-1 rounded-xl transition-all ${isToday ? "date-pill-today" : "hover:bg-gray-100"}`}
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

      {/* アクティビティグリッド */}
      <main className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isDone={hasLogsForActivity(activity.id)}
              iconBlob={iconBlobMap.get(activity.id)}
              onClick={() => handleActivityClick(activity)}
              onEdit={() => setEditActivity(activity)}
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
              追加
            </span>
          </button>
        </div>
      </main>

      {/* 記録ダイアログ */}
      {dialogOpen && selectedActivity && (
        <RecordDialog
          activity={selectedActivity}
          date={date}
          onClose={() => {
            setDialogOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}

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
    </div>
  );
}
