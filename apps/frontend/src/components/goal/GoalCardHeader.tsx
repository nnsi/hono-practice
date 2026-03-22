import { useCallback, useRef, useState } from "react";

import dayjs from "dayjs";
import { ChevronDown, ChevronUp, Pause } from "lucide-react";

import { goalRepository } from "../../db/goalRepository";
import type { DexieActivity } from "../../db/schema";
import { syncEngine } from "../../sync/syncEngine";
import { getActivityIcon } from "./activityHelpers";
import { GoalCardActions } from "./GoalCardActions";
import type { Goal } from "./types";
export function GoalCardHeader({
  goal,
  activity,
  isExpanded,
  isPast,
  localBalance,
  debtCapped,
  balanceColor,
  statusBadge,
  isCurrentlyFrozen,
  showDeleteConfirm,
  deleting,
  onToggleExpand,
  onEditStart,
  onRecordOpen,
  onDeactivate,
  onDeleteConfirm,
  onDeleteCancel,
  onHandleDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  isExpanded: boolean;
  isPast: boolean;
  localBalance: number;
  debtCapped: boolean;
  balanceColor: string;
  statusBadge: { label: string; className: string };
  isCurrentlyFrozen: boolean;
  showDeleteConfirm: boolean;
  deleting: boolean;
  onToggleExpand: () => void;
  onEditStart: () => void;
  onRecordOpen?: () => void;
  onDeactivate?: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onHandleDelete: () => void;
}) {
  // --- インライン編集 ---
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

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
    if (Number.isNaN(num) || num <= 0 || num === goal.dailyTargetQuantity)
      return;
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggleExpand();
      }}
      className="w-full px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
    >
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 pt-0.5">{getActivityIcon(activity)}</div>
        <div className="flex-1 min-w-0">
          {/* 行1: アクティビティ名 + バランス + シェブロン */}
          <div className="flex items-start gap-2">
            <span className="flex-1 font-semibold text-sm min-w-[10em] break-words">
              {activity?.name ?? "不明なアクティビティ"}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${balanceColor}`}
              >
                {localBalance < 0 ? "-" : "+"}
                {Math.abs(localBalance).toLocaleString()}
                <span className="text-[10px] ml-0.5">
                  {activity?.quantityUnit ?? ""}
                </span>
                {debtCapped && (
                  <span className="text-[9px] ml-0.5 text-orange-500">
                    (上限)
                  </span>
                )}
              </span>
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </div>
          </div>

          {/* 行2: バッジ + メタ情報 + アクションボタン */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            {isCurrentlyFrozen && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 whitespace-nowrap flex-shrink-0">
                <Pause size={10} />
                一時停止中
              </span>
            )}

            {/* インライン編集 */}
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
                <span className="ml-0.5 text-xs text-gray-500">
                  {activity?.quantityUnit ?? ""}/日
                </span>
              </span>
            ) : (
              <span
                onClick={!isPast ? startInlineEdit : undefined}
                className={`text-xs text-gray-500 shrink-0 ${!isPast ? "cursor-pointer hover:text-blue-600 hover:underline" : ""}`}
                title={!isPast ? "クリックで編集" : undefined}
              >
                {goal.dailyTargetQuantity.toLocaleString()}
                {activity?.quantityUnit ?? ""}/日
              </span>
            )}
            <span className="text-gray-300 shrink-0 text-xs">|</span>
            <span className="whitespace-nowrap shrink-0 text-xs text-gray-500">
              {dayjs(goal.startDate).format("M/D")}〜
              {goal.endDate ? dayjs(goal.endDate).format("M/D") : ""}
            </span>

            <div className="flex-1" />

            <GoalCardActions
              isPast={isPast}
              goalIsActive={goal.isActive}
              showDeleteConfirm={showDeleteConfirm}
              deleting={deleting}
              onRecordOpen={onRecordOpen}
              onEditStart={onEditStart}
              onDeactivate={onDeactivate}
              onDeleteConfirm={onDeleteConfirm}
              onDeleteCancel={onDeleteCancel}
              onHandleDelete={onHandleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
