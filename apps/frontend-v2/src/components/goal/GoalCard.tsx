import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from "lucide-react";
import type { DexieActivity } from "../../db/schema";
import type { Goal, UpdateGoalPayload } from "./types";
import { getActivityIcon } from "./activityHelpers";
import { EditGoalForm } from "./EditGoalForm";
import { GoalStatsDetail } from "./GoalStatsDetail";

export function GoalCard({
  goal,
  activity,
  isExpanded,
  isEditing,
  isPast = false,
  onToggleExpand,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  isExpanded: boolean;
  isEditing: boolean;
  isPast?: boolean;
  onToggleExpand: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onUpdate: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const totalDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const end = goal.endDate ? dayjs(goal.endDate) : dayjs();
    return Math.max(end.diff(start, "day") + 1, 1);
  }, [goal.startDate, goal.endDate]);

  const elapsedDays = useMemo(() => {
    const start = dayjs(goal.startDate);
    const today = dayjs();
    const end = goal.endDate ? dayjs(goal.endDate) : today;
    const effectiveEnd = today.isBefore(end) ? today : end;
    return Math.max(effectiveEnd.diff(start, "day") + 1, 0);
  }, [goal.startDate, goal.endDate]);

  const progressPercent = useMemo(() => {
    if (totalDays === 0) return 0;
    const pct = (elapsedDays / totalDays) * 100;
    return Math.min(pct, 100);
  }, [elapsedDays, totalDays]);

  const balanceColor = goal.currentBalance < 0 ? "text-red-600" : "text-blue-600";
  const balanceLabel = goal.currentBalance < 0 ? "負債" : "貯金";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isEditing) {
    return (
      <EditGoalForm
        goal={goal}
        activity={activity}
        onCancel={onEditEnd}
        onSave={onUpdate}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border ${isPast ? "border-gray-200 bg-gray-50 opacity-75" : "border-gray-200 bg-white"} shadow-sm overflow-hidden transition-all duration-200`}
    >
      {/* カードヘッダー */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* アクティビティアイコン */}
        <div className="flex-shrink-0">{getActivityIcon(activity)}</div>

        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>
              {goal.dailyTargetQuantity}
              {activity?.quantityUnit ?? ""}/日
            </span>
            <span className="text-gray-300">|</span>
            <span>
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </span>
          </div>
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className={`text-xs font-medium ${balanceColor}`}>
              {balanceLabel}: {Math.abs(goal.currentBalance).toLocaleString()}
              {activity?.quantityUnit ?? ""}
            </span>
          </div>
          {!isPast && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStart();
              }}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Pencil size={14} className="text-gray-400" />
            </button>
          )}
          {isPast && !showDeleteConfirm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Trash2 size={14} className="text-gray-400" />
            </button>
          )}
          {isPast && showDeleteConfirm && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                削除
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* プログレスバー */}
      <div className="px-4 pb-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>{elapsedDays}日経過</span>
          <span>全{totalDays}日</span>
        </div>
      </div>

      {/* 展開時: 統計詳細 */}
      {isExpanded && (
        <GoalStatsDetail goal={goal} activity={activity} />
      )}
    </div>
  );
}
