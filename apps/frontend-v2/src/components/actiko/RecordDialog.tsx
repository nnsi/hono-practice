import { useState } from "react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity, DexieActivityKind } from "../../db/schema";

export function RecordDialog({
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
