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
    await activityLogRepository.create({
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
    if (res.ok) {
      const data = await res.json();
      const mapped = data.activities.map(
        (a: Record<string, unknown>) => ({
          id: a.id,
          userId: a.userId ?? a.user_id,
          name: a.name ?? "",
          label: a.label ?? "",
          emoji: a.emoji ?? "",
          iconType: a.iconType ?? a.icon_type ?? "emoji",
          iconUrl: a.iconUrl ?? a.icon_url ?? null,
          iconThumbnailUrl: a.iconThumbnailUrl ?? a.icon_thumbnail_url ?? null,
          description: a.description ?? "",
          quantityUnit: a.quantityUnit ?? a.quantity_unit ?? "",
          orderIndex: a.orderIndex ?? a.order_index ?? "",
          showCombinedStats:
            a.showCombinedStats ?? a.show_combined_stats ?? true,
          createdAt:
            typeof a.createdAt === "string"
              ? a.createdAt
              : ((a.created_at as string) ?? new Date().toISOString()),
          updatedAt:
            typeof a.updatedAt === "string"
              ? a.updatedAt
              : ((a.updated_at as string) ?? new Date().toISOString()),
          deletedAt: a.deletedAt ?? a.deleted_at ?? null,
        }),
      );
      await activityRepository.upsertActivities(mapped);
      if (data.activityKinds?.length > 0) {
        const kinds = data.activityKinds.map(
          (k: Record<string, unknown>) => ({
            id: k.id,
            activityId: k.activityId ?? k.activity_id,
            name: k.name ?? "",
            color: k.color ?? null,
            orderIndex: k.orderIndex ?? k.order_index ?? "",
            createdAt:
              typeof k.createdAt === "string"
                ? k.createdAt
                : ((k.created_at as string) ?? new Date().toISOString()),
            updatedAt:
              typeof k.updatedAt === "string"
                ? k.updatedAt
                : ((k.updated_at as string) ?? new Date().toISOString()),
            deletedAt: k.deletedAt ?? k.deleted_at ?? null,
          }),
        );
        await activityRepository.upsertActivityKinds(kinds);
      }
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
