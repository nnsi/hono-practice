import { useCallback, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { useActivityLogsByDate } from "../hooks/useActivityLogs";
import { useActivityKinds } from "../hooks/useActivityKinds";
import { activityLogRepository } from "../db/activityLogRepository";
import { syncEngine } from "../sync/syncEngine";
import type { DexieActivity } from "../db/schema";

type ActikoPageProps = {
  onLogout: () => void;
};

export function ActikoPage({ onLogout }: ActikoPageProps) {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { activities } = useActivities();
  const { logs } = useActivityLogsByDate(date);

  // ダイアログ状態
  const [selectedActivity, setSelectedActivity] = useState<DexieActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const goToPrev = () => setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"));
  const goToNext = () => setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"));
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

  const handleQuickRecord = async (activity: DexieActivity, quantity: number) => {
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
    // バックグラウンド同期トリガー
    syncEngine.syncActivityLogs();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Actiko</h1>
          <button
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="ログアウト"
          >
            <LogOut size={20} />
          </button>
        </div>
        {/* 日付ナビゲーション */}
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={goToPrev} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className={`text-base font-medium px-3 py-1 rounded-lg ${isToday ? "bg-black text-white" : "hover:bg-gray-100"}`}
          >
            {dayjs(date).format("M/D (ddd)")}
          </button>
          <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* アクティビティグリッド */}
      <main className="p-4">
        {activities.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg mb-2">アクティビティがありません</p>
            <p className="text-sm">v1フロントエンドでアクティビティを作成してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isDone={hasLogsForActivity(activity.id)}
                onClick={() => handleActivityClick(activity)}
              />
            ))}
          </div>
        )}
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
    </div>
  );
}

// アクティビティカード
function ActivityCard({
  activity,
  isDone,
  onClick,
}: {
  activity: DexieActivity;
  isDone: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-4 rounded-xl border
        min-h-[120px] select-none transition-all duration-150
        active:scale-95 hover:shadow-md
        ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:bg-gray-50"}
      `}
    >
      <span className="text-3xl mb-2">
        {activity.iconType === "emoji" && activity.emoji
          ? activity.emoji
          : activity.iconThumbnailUrl || activity.iconUrl
            ? <img src={activity.iconThumbnailUrl || activity.iconUrl || ""} alt="" className="w-8 h-8 rounded" />
            : "📝"}
      </span>
      <span className="text-sm font-medium text-center leading-tight">
        {activity.name}
      </span>
      {activity.quantityUnit && (
        <span className="text-xs text-gray-400 mt-1">{activity.quantityUnit}</span>
      )}
    </button>
  );
}

// 記録ダイアログ
function RecordDialog({
  activity,
  date,
  onRecord,
  onClose,
}: {
  activity: DexieActivity;
  date: string;
  onRecord: (activity: DexieActivity, quantity: number) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const { kinds } = useActivityKinds(activity.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const q = Number(quantity);
    if (selectedKindId) {
      await activityLogRepository.create({
        activityId: activity.id,
        activityKindId: selectedKindId,
        quantity: q,
        memo: "",
        date,
        time: null,
      });
      syncEngine.syncActivityLogs();
      onClose();
    } else {
      onRecord(activity, q);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">
              {activity.emoji || "📝"}
            </span>
            {activity.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">種類</label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(selectedKindId === kind.id ? null : kind.id)
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
              数量 {activity.quantityUnit && `(${activity.quantityUnit})`}
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
