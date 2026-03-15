import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { DatePickerField } from "../common/DatePickerField";
import { ModalOverlay } from "../common/ModalOverlay";
import { getActivityEmoji } from "./activityHelpers";
import { DayTargetsInput } from "./DayTargetsInput";
import type { CreateGoalPayload } from "./types";
import { useCreateGoalDialog } from "./useCreateGoalDialog";

export function CreateGoalDialog({
  activities,
  onClose,
  onCreate,
}: {
  activities: DexieActivity[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
}) {
  const {
    activityId,
    setActivityId,
    target,
    setTarget,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dayTargetsEnabled,
    setDayTargetsEnabled,
    dayTargetValues,
    setDayTargetValues,
    debtCapEnabled,
    setDebtCapEnabled,
    debtCapValue,
    setDebtCapValue,
    submitting,
    errorMsg,
    selectedActivity,
    handleSubmit,
  } = useCreateGoalDialog(activities, onCreate);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新しい目標を作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
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
              <DatePickerField value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                終了日（任意）
              </label>
              <DatePickerField
                value={endDate}
                onChange={setEndDate}
                placeholder="未設定"
                allowClear
              />
            </div>
          </div>

          {/* 曜日別目標 */}
          <DayTargetsInput
            enabled={dayTargetsEnabled}
            onToggle={setDayTargetsEnabled}
            values={dayTargetValues}
            onChange={setDayTargetValues}
            defaultTarget={target}
          />

          {/* 負債上限 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <input
                type="checkbox"
                checked={debtCapEnabled}
                onChange={(e) => {
                  setDebtCapEnabled(e.target.checked);
                  if (e.target.checked && !debtCapValue) {
                    setDebtCapValue(String(Number(target) * 7));
                  }
                }}
                className="rounded"
              />
              負債上限を設定
            </label>
            {debtCapEnabled && (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={debtCapValue}
                  onChange={(e) => setDebtCapValue(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="any"
                />
                <span className="text-xs text-gray-500">
                  {selectedActivity?.quantityUnit ?? ""}
                </span>
              </div>
            )}
          </div>

          {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

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
    </ModalOverlay>
  );
}
