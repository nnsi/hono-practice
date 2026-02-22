import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity } from "../../db/schema";

export function CreateLogDialog({
  date,
  activities,
  onClose,
}: {
  date: string;
  activities: DexieActivity[];
  onClose: () => void;
}) {
  const [selectedActivity, setSelectedActivity] =
    useState<DexieActivity | null>(null);

  if (selectedActivity) {
    return (
      <CreateLogFormDialog
        date={date}
        activity={selectedActivity}
        onBack={() => setSelectedActivity(null)}
        onClose={onClose}
      />
    );
  }

  // アクティビティ選択画面
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-3">
          <h2 className="text-lg font-bold">アクティビティを選択</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 space-y-2">
          {activities.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              アクティビティがありません
            </div>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all text-left"
              >
                <span className="flex items-center justify-center w-10 h-10 text-2xl shrink-0">
                  {activity.iconType === "upload" &&
                  activity.iconThumbnailUrl ? (
                    <img
                      src={activity.iconThumbnailUrl}
                      alt={activity.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    activity.emoji || "📝"
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium">{activity.name}</div>
                  {activity.quantityUnit && (
                    <div className="text-xs text-gray-400">
                      {activity.quantityUnit}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- 新規作成フォームダイアログ ---

function CreateLogFormDialog({
  date,
  activity,
  onBack,
  onClose,
}: {
  date: string;
  activity: DexieActivity;
  onBack: () => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [memo, setMemo] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { kinds } = useActivityKinds(activity.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: selectedKindId,
      quantity: quantity !== "" ? Number(quantity) : null,
      memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">
                {activity.emoji || "📝"}
              </span>
              {activity.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                種類
              </label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(
                        selectedKindId === kind.id ? null : kind.id,
                      )
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
              数量{" "}
              {activity.quantityUnit && `(${activity.quantityUnit})`}
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
