import { useState } from "react";

import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import dayjs from "dayjs";
import { Text, View } from "react-native";

import { FreezePeriodManager } from "./FreezePeriodManager";
import { GoalCardHeader } from "./GoalCardHeader";
import { GoalStatsDetail } from "./GoalStatsDetail";
import { useGoalCard } from "./useGoalCard";

type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
};

type IconBlob = {
  base64: string;
  mimeType: string;
};

export function GoalCard({
  goal,
  activity,
  iconBlob,
  isExpanded,
  isPast = false,
  onToggleExpand,
  onEditStart,
  onDeactivate,
  onDelete,
  onRecordOpen,
}: {
  goal: GoalForCard;
  activity: ActivityRecord | null;
  iconBlob?: IconBlob;
  isExpanded: boolean;
  isPast?: boolean;
  onToggleExpand: () => void;
  onEditStart?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => Promise<void>;
  onRecordOpen?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const gradientColor = isPast
    ? null
    : localBalance > 0
      ? "rgba(34, 197, 94, 0.2)"
      : localBalance < 0
        ? "rgba(239, 68, 68, 0.2)"
        : "rgba(156, 163, 175, 0.2)";

  const shadowStyle = isPast
    ? undefined
    : {
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      };

  const cardContent = (
    <>
      <GoalCardHeader
        goal={goal}
        activity={activity}
        iconBlob={iconBlob}
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
        onDeactivate={onDeactivate}
        onDelete={onDelete}
        onRecordOpen={onRecordOpen}
        onDeleteConfirm={() => setShowDeleteConfirm(true)}
        onDeleteCancel={() => setShowDeleteConfirm(false)}
        onHandleDelete={handleDelete}
      />

      <View className="px-4 pb-2">
        <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <View
            className="h-full rounded-full bg-blue-50 dark:bg-blue-900/200"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <View className="flex-row justify-between mt-0.5">
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {elapsedDays}日経過
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            全{totalDays}日
          </Text>
        </View>
      </View>

      {showInactiveDatesEnabled && inactiveDates.length > 0 && (
        <View className="mt-1 px-3 py-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            <Text className="font-medium">やらなかった日付: </Text>
            {inactiveDates.slice(0, 3).map((date, index) => (
              <Text key={date}>
                {index > 0 ? ", " : ""}
                {dayjs(date).format("M/D")}
              </Text>
            ))}
            {inactiveDates.length > 3 && (
              <Text> 他{inactiveDates.length - 3}日</Text>
            )}
          </Text>
        </View>
      )}

      {isExpanded && (
        <View className="bg-white dark:bg-gray-800 rounded-b-2xl">
          <GoalStatsDetail goal={goal} activity={activity} />
          {!isPast && (
            <View className="px-4 pb-4">
              <FreezePeriodManager goalId={goal.id} />
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      className={`rounded-2xl mb-3 overflow-hidden ${
        isPast
          ? "border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-75"
          : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
      style={shadowStyle}
    >
      {gradientColor && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${completionPercent}%`,
            backgroundColor: gradientColor,
          }}
        />
      )}
      {cardContent}
    </View>
  );
}
