import { useCallback, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useLiveQuery } from "dexie-react-hooks";

import {
  ChevronDown,
  ChevronUp,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { db, type DexieActivity } from "../../db/schema";
import { goalRepository } from "../../db/goalRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { Goal, UpdateGoalPayload } from "./types";
import { getActivityIcon } from "./activityHelpers";
import { EditGoalForm } from "./EditGoalForm";
import { GoalStatsDetail } from "./GoalStatsDetail";

dayjs.extend(isSameOrBefore);

// --- C. ステータスバッジ ---
type StatusBadge = { label: string; className: string };

function getStatusBadge(
  goal: Goal,
  hasTodayLog: boolean,
  balance: number,
): StatusBadge {
  if (!goal.isActive) {
    return { label: "終了", className: "bg-gray-200 text-gray-600" };
  }
  if (balance < 0) {
    return { label: "負債あり", className: "bg-red-100 text-red-700" };
  }
  if (hasTodayLog) {
    return { label: "順調", className: "bg-green-100 text-green-700" };
  }
  return { label: "達成ペース", className: "bg-green-50 text-green-600" };
}

// --- D. グラデーション背景 ---
function progressGradient(completionPercent: number, balance: number): string {
  const color = balance > 0
    ? "rgba(34, 197, 94, 0.2)"
    : balance < 0
      ? "rgba(239, 68, 68, 0.2)"
      : "rgba(156, 163, 175, 0.2)";
  return `linear-gradient(to right, ${color} ${completionPercent}%, white ${completionPercent}%)`;
}

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
  onRecordOpen,
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
  onRecordOpen?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- B. インライン編集 state ---
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

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

  // --- C. 今日のログがあるか確認 ---
  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("[date+activityId]")
        .equals([todayStr, goal.activityId])
        .filter((log) => !log.deletedAt)
        .count(),
    [todayStr, goal.activityId],
  );
  const hasTodayLog = (todayLogs ?? 0) > 0;

  // --- 完了率（背景グラデーション用、ローカルデータから算出） ---
  const today = dayjs().format("YYYY-MM-DD");
  const actualEndDate = goal.endDate && goal.endDate < today ? goal.endDate : today;

  const periodLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("date")
        .between(goal.startDate, actualEndDate, true, true)
        .filter((log) => log.activityId === goal.activityId && !log.deletedAt)
        .toArray(),
    [goal.activityId, goal.startDate, actualEndDate],
  );

  const { completionPercent, localBalance } = useMemo(() => {
    const localTargetSoFar = goal.dailyTargetQuantity * elapsedDays;
    const localTargetTotal = goal.dailyTargetQuantity * totalDays;
    const localActual = (periodLogs ?? []).reduce((sum, l) => sum + (l.quantity ?? 0), 0);
    const balance = localActual - localTargetSoFar;
    if (localTargetTotal <= 0) return { completionPercent: 0, localBalance: balance };
    return {
      completionPercent: Math.min((localActual / localTargetTotal) * 100, 100),
      localBalance: balance,
    };
  }, [goal.dailyTargetQuantity, elapsedDays, totalDays, periodLogs]);

  // --- やらなかった日付（showInactiveDates設定時） ---
  const showInactiveDates = useMemo(() => {
    try {
      const raw = localStorage.getItem("actiko-v2-settings");
      if (!raw) return false;
      const settings = JSON.parse(raw);
      return settings.showInactiveDates === true;
    } catch {
      return false;
    }
  }, []);

  const monthStart = useMemo(() => dayjs().startOf("month").format("YYYY-MM-DD"), []);
  const monthEnd = useMemo(() => dayjs().endOf("month").format("YYYY-MM-DD"), []);

  const effectiveStart = useMemo(
    () => (goal.startDate > monthStart ? goal.startDate : monthStart),
    [goal.startDate, monthStart],
  );
  const effectiveEnd = useMemo(() => {
    const end = goal.endDate && goal.endDate < monthEnd ? goal.endDate : monthEnd;
    return end > todayStr ? todayStr : end;
  }, [goal.endDate, monthEnd, todayStr]);

  const monthLogs = useLiveQuery(
    () => {
      if (!showInactiveDates) return [];
      return db.activityLogs
        .where("date")
        .between(effectiveStart, effectiveEnd, true, true)
        .filter((log) => log.activityId === goal.activityId && !log.deletedAt)
        .toArray();
    },
    [goal.activityId, effectiveStart, effectiveEnd, showInactiveDates],
  );

  const inactiveDates = useMemo(() => {
    if (!showInactiveDates || !monthLogs) return [];
    const activeDates = new Set(
      monthLogs.filter((l) => (l.quantity ?? 0) > 0).map((l) => l.date),
    );
    const result: string[] = [];
    let d = dayjs(effectiveStart);
    while (d.isSameOrBefore(effectiveEnd)) {
      const dateStr = d.format("YYYY-MM-DD");
      if (!activeDates.has(dateStr)) {
        result.push(dateStr);
      }
      d = d.add(1, "day");
    }
    return result;
  }, [showInactiveDates, monthLogs, effectiveStart, effectiveEnd]);

  const statusBadge = getStatusBadge(goal, hasTodayLog, localBalance);

  const balanceColor = localBalance < 0 ? "text-red-600" : "text-blue-600";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // --- B. インライン編集ハンドラ ---
  const startInlineEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPast) return;
      setInlineValue(String(goal.dailyTargetQuantity));
      setInlineEditing(true);
      requestAnimationFrame(() => inlineInputRef.current?.select());
    },
    [goal.dailyTargetQuantity, isPast],
  );

  const commitInlineEdit = useCallback(async () => {
    setInlineEditing(false);
    const num = Number(inlineValue);
    if (Number.isNaN(num) || num <= 0 || num === goal.dailyTargetQuantity) return;
    await goalRepository.updateGoal(goal.id, { dailyTargetQuantity: num });
    syncEngine.syncGoals();
  }, [inlineValue, goal.id, goal.dailyTargetQuantity]);

  const handleInlineKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitInlineEdit();
      } else if (e.key === "Escape") {
        setInlineEditing(false);
      }
    },
    [commitInlineEdit],
  );

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

  // --- D. 背景スタイル ---
  const cardBg = isPast
    ? undefined
    : { background: progressGradient(completionPercent, localBalance) };

  return (
    <div
      className={`rounded-2xl ${isPast ? "border border-gray-200 bg-gray-50 opacity-75" : "border border-gray-200/50 shadow-soft"} overflow-hidden transition-all duration-500`}
      style={cardBg}
    >
      {/* カードヘッダー */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggleExpand(); }}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        {/* アクティビティアイコン */}
        <div className="flex-shrink-0">{getActivityIcon(activity)}</div>

        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
            {/* C. ステータスバッジ */}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 min-w-0">
            {/* B. インライン編集 */}
            {inlineEditing ? (
              <span
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center shrink-0"
              >
                <input
                  ref={inlineInputRef}
                  type="number"
                  inputMode="decimal"
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  onBlur={commitInlineEdit}
                  onKeyDown={handleInlineKeyDown}
                  className="w-14 px-1 py-0 border border-blue-400 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                  step="any"
                />
                <span className="ml-0.5">
                  {activity?.quantityUnit ?? ""}/日
                </span>
              </span>
            ) : (
              <span
                onClick={!isPast ? startInlineEdit : undefined}
                className={`truncate ${!isPast ? "cursor-pointer hover:text-blue-600 hover:underline" : ""}`}
                title={!isPast ? "クリックで編集" : undefined}
              >
                {goal.dailyTargetQuantity.toLocaleString()}
                {activity?.quantityUnit ?? ""}/日
              </span>
            )}
            <span className="text-gray-300 shrink-0">|</span>
            <span className="whitespace-nowrap shrink-0">
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </span>
          </div>
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-[11px] font-medium text-right leading-tight ${balanceColor}`}>
            <span className="whitespace-nowrap">{localBalance < 0 ? "-" : "+"}{Math.abs(localBalance).toLocaleString()}</span>
            <br className="sm:hidden" />
            <span className="text-[10px] sm:ml-0.5">{activity?.quantityUnit ?? ""}</span>
          </span>
          {/* A. 直接ログ作成ボタン */}
          {!isPast && onRecordOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRecordOpen();
              }}
              className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"
              title="活動を記録"
            >
              <PlusCircle size={14} className="text-blue-500" />
            </button>
          )}
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
      </div>

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

      {/* やらなかった日付 */}
      {showInactiveDates && inactiveDates.length > 0 && (
        <div className="mt-1 px-3 py-1 text-xs text-gray-500">
          <span className="font-medium">やらなかった日付: </span>
          {inactiveDates.slice(0, 3).map((date, index) => (
            <span key={date}>
              {index > 0 && ", "}
              {new Date(date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
            </span>
          ))}
          {inactiveDates.length > 3 && <span> 他{inactiveDates.length - 3}日</span>}
        </div>
      )}

      {/* 展開時: 統計詳細（グラデーション背景を適用しない） */}
      {isExpanded && (
        <div className="bg-white rounded-b-2xl">
          <GoalStatsDetail goal={goal} activity={activity} />
        </div>
      )}
    </div>
  );
}
