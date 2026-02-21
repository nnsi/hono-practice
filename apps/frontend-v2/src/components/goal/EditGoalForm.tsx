import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { DexieActivity } from "../../db/schema";
import type { Goal, UpdateGoalPayload } from "./types";
import { getActivityIcon } from "./activityHelpers";

export function EditGoalForm({
  goal,
  activity,
  onCancel,
  onSave,
  onDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  onCancel: () => void;
  onSave: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => void;
}) {
  const [target, setTarget] = useState(String(goal.dailyTargetQuantity));
  const [startDate, setStartDate] = useState(goal.startDate);
  const [endDate, setEndDate] = useState(goal.endDate ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        dailyTargetQuantity: Number(target),
        startDate,
        endDate: endDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("この目標を終了しますか？")) return;
    setSaving(true);
    try {
      await onSave({ isActive: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 shadow-sm overflow-hidden">
      <form onSubmit={handleSave} className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {getActivityIcon(activity)}
            <span className="font-semibold text-sm">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded-md"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* 日次目標 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            日次目標 {activity?.quantityUnit && `(${activity.quantityUnit})`}
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="any"
          />
        </div>

        {/* 日付 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            保存
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            終了
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
