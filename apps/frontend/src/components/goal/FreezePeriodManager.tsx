import { useState } from "react";

import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { Pause, Play, Trash2 } from "lucide-react";

import { goalFreezePeriodRepository } from "../../db/goalFreezePeriodRepository";
import { db } from "../../db/schema";
import { syncEngine } from "../../sync/syncEngine";
import { DatePickerField } from "../common/DatePickerField";

type FreezePeriodManagerProps = {
  goalId: string;
};

export function FreezePeriodManager({ goalId }: FreezePeriodManagerProps) {
  const today = dayjs().format("YYYY-MM-DD");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");

  const freezePeriods = useLiveQuery(
    () =>
      db.goalFreezePeriods
        .where("goalId")
        .equals(goalId)
        .filter((fp) => !fp.deletedAt)
        .toArray(),
    [goalId],
  );

  if (!freezePeriods) return null;

  const sorted = [...freezePeriods].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  const activePeriod = sorted.find(
    (fp) =>
      fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
  );

  const handleFreezeToday = async () => {
    await goalFreezePeriodRepository.createGoalFreezePeriod({
      goalId,
      startDate: today,
    });
    syncEngine.syncGoalFreezePeriods();
  };

  const handleFreezeWithDates = async () => {
    await goalFreezePeriodRepository.createGoalFreezePeriod({
      goalId,
      startDate,
      endDate: endDate || null,
    });
    setShowForm(false);
    setStartDate(today);
    setEndDate("");
    syncEngine.syncGoalFreezePeriods();
  };

  const handleResume = async (id: string) => {
    const period = sorted.find((fp) => fp.id === id);
    if (period?.startDate === today) {
      // 今日開始→今日再開はフリーズ不要なので削除
      await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
    } else {
      // endDateは昨日（inclusive）にセット
      const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      await goalFreezePeriodRepository.updateGoalFreezePeriod(id, {
        endDate: yesterday,
      });
    }
    syncEngine.syncGoalFreezePeriods();
  };

  const handleDelete = async (id: string) => {
    await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
    setDeletingId(null);
    syncEngine.syncGoalFreezePeriods();
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">一時停止期間</span>
        {activePeriod ? (
          <button
            type="button"
            onClick={() => handleResume(activePeriod.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Play size={12} />
            再開する
          </button>
        ) : showForm ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFreezeToday}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Pause size={12} />
              今日から
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              日付指定
            </button>
          </div>
        )}
      </div>

      {showForm && !activePeriod && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg space-y-2">
          <div>
            <label className="text-xs text-gray-600 block mb-1">開始日</label>
            <DatePickerField value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">終了日</label>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder="未定（手動で再開）"
              allowClear
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setStartDate(today);
                setEndDate("");
              }}
              className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleFreezeWithDates}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              一時停止する
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">一時停止の履歴はありません</p>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((fp) => {
            const isActive =
              fp.startDate <= today &&
              (fp.endDate == null || fp.endDate >= today);
            return (
              <li
                key={fp.id}
                className="flex items-center justify-between text-xs py-1"
              >
                <span
                  className={`${isActive ? "text-blue-700 font-medium" : "text-gray-600"}`}
                >
                  {dayjs(fp.startDate).format("M/D")}
                  {" - "}
                  {fp.endDate ? dayjs(fp.endDate).format("M/D") : "進行中"}
                </span>
                {deletingId === fp.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(fp.id)}
                      className="px-2 py-0.5 text-[11px] bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      削除
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-0.5 text-[11px] border border-gray-300 rounded hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(fp.id)}
                    className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Trash2 size={12} className="text-gray-400" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
