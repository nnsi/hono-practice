import { useCallback, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus, Pencil } from "lucide-react";
import { useActivities } from "../hooks/useActivities";
import { useActivityLogsByDate } from "../hooks/useActivityLogs";
import { useActivityKinds } from "../hooks/useActivityKinds";
import { activityLogRepository } from "../db/activityLogRepository";
import { activityRepository } from "../db/activityRepository";
import { syncEngine } from "../sync/syncEngine";
import { apiFetch } from "../utils/apiClient";
import type { DexieActivity, DexieActivityKind } from "../db/schema";

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

// アクティビティカード
function ActivityCard({
  activity,
  isDone,
  onClick,
  onEdit,
}: {
  activity: DexieActivity;
  isDone: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full flex flex-col items-center justify-center p-4 rounded-xl border
          min-h-[120px] select-none transition-all duration-150
          active:scale-95 hover:shadow-md
          ${isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200 hover:bg-gray-50"}
        `}
      >
        <span className="text-3xl mb-2">
          {activity.iconType === "emoji" && activity.emoji ? (
            activity.emoji
          ) : activity.iconThumbnailUrl || activity.iconUrl ? (
            <img
              src={activity.iconThumbnailUrl || activity.iconUrl || ""}
              alt=""
              className="w-8 h-8 rounded"
            />
          ) : (
            "📝"
          )}
        </span>
        <span className="text-sm font-medium text-center leading-tight">
          {activity.name}
        </span>
        {activity.quantityUnit && (
          <span className="text-xs text-gray-400 mt-1">
            {activity.quantityUnit}
          </span>
        )}
      </button>
      {/* 編集ボタン */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-1 right-1 p-1.5 rounded-full bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Pencil size={12} />
      </button>
    </div>
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
  const [memo, setMemo] = useState("");
  const { kinds } = useActivityKinds(activity.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const q = Number(quantity);
    if (selectedKindId || memo) {
      await activityLogRepository.create({
        activityId: activity.id,
        activityKindId: selectedKindId,
        quantity: q,
        memo,
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
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">{activity.emoji || "📝"}</span>
            {activity.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <KindSelector
              kinds={kinds}
              selectedKindId={selectedKindId}
              onSelect={setSelectedKindId}
            />
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

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="メモを入力..."
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

// 種類セレクタ（共通）
function KindSelector({
  kinds,
  selectedKindId,
  onSelect,
}: {
  kinds: DexieActivityKind[];
  selectedKindId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-600">種類</label>
      <div className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() =>
              onSelect(selectedKindId === kind.id ? null : kind.id)
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
  );
}

// アクティビティ作成ダイアログ
function CreateActivityDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kinds, setKinds] = useState<{ name: string; color: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const res = await apiFetch("/users/activities", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        quantityUnit,
        emoji,
        iconType: "emoji",
        showCombinedStats,
        kinds: kinds.filter((k) => k.name.trim()),
      }),
    });

    if (res.ok) {
      await onCreated();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新規アクティビティ</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 絵文字 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              絵文字
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="アクティビティ名"
              autoFocus
            />
          </div>

          {/* 単位 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              単位
            </label>
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="回, 分, km など"
            />
          </div>

          {/* 合算統計 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCombinedStats}
              onChange={(e) => setShowCombinedStats(e.target.checked)}
              className="h-5 w-5 rounded accent-blue-600"
            />
            <span className="text-sm">合算統計を表示</span>
          </label>

          {/* 種類 */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">種類</div>
            {kinds.map((kind, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={kind.name}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, name: e.target.value } : k,
                      ),
                    )
                  }
                  placeholder="種類名"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={kind.color || "#3b82f6"}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, color: e.target.value } : k,
                      ),
                    )
                  }
                  className="w-10 h-10 p-0.5 border border-gray-300 rounded cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() =>
                    setKinds((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                >
                  -
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setKinds((prev) => [...prev, { name: "", color: "#3b82f6" }])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 種類を追加
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            作成
          </button>
        </form>
      </div>
    </div>
  );
}

// アクティビティ編集ダイアログ
function EditActivityDialog({
  activity,
  onClose,
  onUpdated,
}: {
  activity: DexieActivity;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [name, setName] = useState(activity.name);
  const [quantityUnit, setQuantityUnit] = useState(activity.quantityUnit);
  const [emoji, setEmoji] = useState(activity.emoji);
  const [showCombinedStats, setShowCombinedStats] = useState(
    activity.showCombinedStats,
  );
  const { kinds: existingKinds } = useActivityKinds(activity.id);
  const [kinds, setKinds] = useState<
    { id?: string; name: string; color: string }[]
  >([]);
  const [kindsLoaded, setKindsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // existingKindsが読み込まれたら初期化
  if (!kindsLoaded && existingKinds.length > 0) {
    setKinds(
      existingKinds.map((k) => ({
        id: k.id,
        name: k.name,
        color: k.color || "#3b82f6",
      })),
    );
    setKindsLoaded(true);
  }
  if (!kindsLoaded && existingKinds.length === 0) {
    // 一度チェックしてkindsが空の場合もフラグ立て
    // ただしliveQueryの初回undefinedの場合は待つ
    setKindsLoaded(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const res = await apiFetch(`/users/activities/${activity.id}`, {
      method: "PUT",
      body: JSON.stringify({
        activity: {
          name: name.trim(),
          quantityUnit,
          emoji,
          showCombinedStats,
        },
        kinds: kinds
          .filter((k) => k.name.trim())
          .map((k) => ({
            id: k.id,
            name: k.name,
            color: k.color,
          })),
      }),
    });

    if (res.ok) {
      await onUpdated();
      onClose();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const res = await apiFetch(`/users/activities/${activity.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await onUpdated();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">アクティビティ編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 絵文字 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              絵文字
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 単位 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              単位
            </label>
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="回, 分, km など"
            />
          </div>

          {/* 合算統計 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCombinedStats}
              onChange={(e) => setShowCombinedStats(e.target.checked)}
              className="h-5 w-5 rounded accent-blue-600"
            />
            <span className="text-sm">合算統計を表示</span>
          </label>

          {/* 種類 */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">種類</div>
            {kinds.map((kind, i) => (
              <div key={kind.id ?? i} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={kind.name}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, name: e.target.value } : k,
                      ),
                    )
                  }
                  placeholder="種類名"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={kind.color || "#3b82f6"}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, color: e.target.value } : k,
                      ),
                    )
                  }
                  className="w-10 h-10 p-0.5 border border-gray-300 rounded cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() =>
                    setKinds((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                >
                  -
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setKinds((prev) => [...prev, { name: "", color: "#3b82f6" }])
              }
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 種類を追加
            </button>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              保存
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                削除
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
              >
                本当に削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
