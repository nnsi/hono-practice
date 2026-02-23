import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { db, type DexieActivity, type DexieActivityIconBlob } from "../../db/schema";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { CalendarPopover } from "../common/CalendarPopover";

export function ActikoPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);
  const iconBlobs = useLiveQuery(() => db.activityIconBlobs.toArray());
  const iconBlobMap = useMemo(() => {
    const map = new Map<string, DexieActivityIconBlob>();
    for (const blob of iconBlobs ?? []) {
      map.set(blob.activityId, blob);
    }
    return map;
  }, [iconBlobs]);

  // ダイアログ状態
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<DexieActivity | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const goToPrev = () =>
    setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () =>
    setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));

  const isToday = date === dayjs().format("YYYY-MM-DD");

  const hasLogsForActivity = useCallback(
    (activityId: string) => logs.some((l) => l.activityId === activityId),
    [logs],
  );

  const handleActivityClick = (activity: DexieActivity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };


  // Dexie useLiveQueryで自動更新されるため、refreshは不要
  const handleActivityChanged = () => {
    // useLiveQuery が自動でUIを更新するため、何もしなくてOK
  };

  return (
    <div className="bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center justify-between px-4 pr-14 py-2.5 relative">
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
            className={`text-base font-medium px-4 py-1 rounded-xl transition-all ${isToday ? "date-pill-today" : "hover:bg-gray-100"}`}
          >
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
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
