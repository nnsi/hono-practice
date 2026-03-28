import { useState } from "react";

import { useTranslation } from "@packages/i18n";

import type { DexieActivity } from "../../db/schema";
import { EditGoalForm } from "./EditGoalForm";
import { FreezePeriodManager } from "./FreezePeriodManager";
import { GoalCardHeader } from "./GoalCardHeader";
import { GoalStatsDetail } from "./GoalStatsDetail";
import type { Goal, UpdateGoalPayload } from "./types";
import { useGoalCard } from "./useGoalCard";

function progressGradient(completionPercent: number, balance: number): string {
  const color =
    balance > 0
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
  onDeactivate,
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
  onDeactivate?: () => void;
  onDelete: () => Promise<void>;
  onRecordOpen?: () => void;
}) {
  const { t } = useTranslation("goal");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    totalDays,
    elapsedDays,
    localBalance,
    balance,
    isCurrentlyFrozen,
    completionPercent,
    progressPercent,
    showInactiveDatesEnabled,
    inactiveDates,
    statusBadge,
    balanceColor,
  } = useGoalCard(goal);

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

  const cardBg = isPast
    ? undefined
    : { background: progressGradient(completionPercent, localBalance) };

  return (
    <div
      className={`rounded-2xl ${isPast ? "border border-gray-200 bg-gray-50 opacity-75" : "border border-gray-200/50 shadow-soft"} overflow-hidden transition-all duration-500`}
      style={cardBg}
    >
      <GoalCardHeader
        goal={goal}
        activity={activity}
        isExpanded={isExpanded}
        isPast={isPast}
        localBalance={localBalance}
        debtCapped={balance.debtCapped}
        balanceColor={balanceColor}
        statusBadge={statusBadge}
        isCurrentlyFrozen={isCurrentlyFrozen}
        showDeleteConfirm={showDeleteConfirm}
        deleting={deleting}
        onToggleExpand={onToggleExpand}
        onEditStart={onEditStart}
        onRecordOpen={onRecordOpen}
        onDeactivate={onDeactivate}
        onDeleteConfirm={() => setShowDeleteConfirm(true)}
        onDeleteCancel={() => setShowDeleteConfirm(false)}
        onHandleDelete={handleDelete}
      />

      {/* プログレスバー */}
      <div className="px-4 pb-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>
            {elapsedDays}
            {t("elapsedDays")}
          </span>
          <span>
            {t("totalDays")}
            {totalDays}
            {t("daysLabel")}
          </span>
        </div>
      </div>

      {/* やらなかった日付 */}
      {showInactiveDatesEnabled && inactiveDates.length > 0 && (
        <div className="mt-1 px-3 py-1 text-xs text-gray-500">
          <span className="font-medium">{t("inactiveDatesPrefix")}</span>
          {inactiveDates.slice(0, 3).map((date, index) => (
            <span key={date}>
              {index > 0 && ", "}
              {new Date(date).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              })}
            </span>
          ))}
          {inactiveDates.length > 3 && (
            <span>
              {" "}
              {t("inactiveDatesMore")}
              {inactiveDates.length - 3}
              {t("daysLabel")}
            </span>
          )}
        </div>
      )}

      {/* 展開時: 統計詳細 + フリーズ管理 */}
      {isExpanded && (
        <div className="bg-white rounded-b-2xl">
          <GoalStatsDetail goal={goal} activity={activity} />
          {!isPast && <FreezePeriodManager goalId={goal.id} />}
        </div>
      )}
    </div>
  );
}
