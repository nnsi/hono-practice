import { useCallback, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { activityLogRepository } from "../../db/activityLogRepository";
import { activityRepository } from "../../db/activityRepository";
import { syncEngine } from "../../sync/syncEngine";
import { apiFetch } from "../../utils/apiClient";
import type { DexieActivity } from "../../db/schema";
import { mapApiActivity, mapApiActivityKind } from "../../utils/apiMappers";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";

export function ActikoPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);

  // ダイアログ状態
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<DexieActivity | null>(null);

  const goToPrev = () =>
    setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () =>
    setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));
  const goToToday = () => setDate(dayjs().format("YYYY-MM-DD"));

  const isToday = date === dayjs().format("YYYY-MM-DD");

  const hasLogsForActivity = useCallback(
    (activityId: string) => logs.some((l) => l.activityId === activityId),
    [logs],
  );

  const handleActivityClick = (activity: DexieActivity) => {
    setSelectedActivity(activity);
    setDialogOpen(true);
  };

  const handleQuickRecord = async (
    activity: DexieActivity,
    quantity: number,
  ) => {
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: null,
      quantity,
      memo: "",
      date,
      time: null,
    });
    setDialogOpen(false);
    setSelectedActivity(null);
    syncEngine.syncActivityLogs();
  };

  // API→Dexie同期ヘルパー
  const refreshActivities = async () => {
    const res = await apiFetch("/users/v2/activities");
    if (!res.ok) return;
    const data = await res.json();
    await activityRepository.upsertActivities(
      data.activities.map(mapApiActivity),
    );
    if (data.activityKinds?.length > 0) {
      await activityRepository.upsertActivityKinds(
        data.activityKinds.map(mapApiActivityKind),
      );
    }
  };

  return (
    <div className="bg-white">
      {/* ヘッダー */}
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
            className={`text-base font-medium px-3 py-1 rounded-lg ${isToday ? "bg-black text-white" : "hover:bg-gray-100"}`}
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

      {/* アクティビティグリッド */}
      <main className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isDone={hasLogsForActivity(activity.id)}
              onClick={() => handleActivityClick(activity)}
              onEdit={() => setEditActivity(activity)}
            />
          ))}
          {/* 新規追加カード */}
          <button
            type="button"
            onClick={() => setCreateActivityOpen(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-300 min-h-[120px] select-none hover:border-gray-400 hover:bg-gray-50 transition-all group"
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
          onRecord={handleQuickRecord}
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
          onCreated={refreshActivities}
        />
      )}

      {/* アクティビティ編集ダイアログ */}
      {editActivity && (
        <EditActivityDialog
          activity={editActivity}
          onClose={() => setEditActivity(null)}
          onUpdated={refreshActivities}
        />
      )}
    </div>
  );
}
