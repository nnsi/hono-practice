import { useState } from "react";

import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { Pause, Play, Trash2 } from "lucide-react";

import { goalFreezePeriodRepository } from "../../db/goalFreezePeriodRepository";
import { db } from "../../db/schema";
import { syncEngine } from "../../sync/syncEngine";

type FreezePeriodManagerProps = {
  goalId: string;
};

export function FreezePeriodManager({ goalId }: FreezePeriodManagerProps) {
  const today = dayjs().format("YYYY-MM-DD");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleFreeze = async () => {
    await goalFreezePeriodRepository.createGoalFreezePeriod({
      goalId,
      startDate: today,
    });
    syncEngine.syncGoalFreezePeriods();
  };

  const handleResume = async (id: string) => {
    await goalFreezePeriodRepository.updateGoalFreezePeriod(id, {
      endDate: today,
    });
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
        ) : (
          <button
            type="button"
            onClick={handleFreeze}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Pause size={12} />
            一時停止する
          </button>
        )}
      </div>

      {sorted.length === 0 && (
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
