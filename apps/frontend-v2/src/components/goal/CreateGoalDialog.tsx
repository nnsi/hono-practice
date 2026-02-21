import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { DexieActivity } from "../../db/schema";
import type { CreateGoalPayload } from "./types";
import { getActivityEmoji } from "./activityHelpers";

export function CreateGoalDialog({
  activities,
  onClose,
  onCreate,
}: {
  activities: DexieActivity[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
}) {
  const [activityId, setActivityId] = useState("");
  const [target, setTarget] = useState("1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!activityId) {
      setErrorMsg("アクティビティを選択してください");
      return;
    }
    if (Number(target) <= 0) {
      setErrorMsg("日次目標は0より大きい数値を入力してください");
      return;
    }
    if (!startDate) {
      setErrorMsg("開始日を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        activityId,
        dailyTargetQuantity: Number(target),
        startDate,
        ...(endDate ? { endDate } : {}),
      });
    } catch {
      setErrorMsg("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新しい目標を作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* アクティビティ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              アクティビティ
            </label>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400">
                アクティビティがありません
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActivityId(a.id)}
                    className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                      activityId === a.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{getActivityEmoji(a)}</span>
                    <span className="text-[10px] mt-1 truncate w-full text-center">
                      {a.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 日次目標 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              日次目標
              {selectedActivity?.quantityUnit && (
                <span className="ml-1 text-xs text-gray-400">
                  ({selectedActivity.quantityUnit})
                </span>
              )}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="any"
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
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
              <label className="block text-sm font-medium text-gray-600 mb-1">
                終了日（任意）
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
